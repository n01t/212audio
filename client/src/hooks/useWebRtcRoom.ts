import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

type Role = 'HOST' | 'AUDIENCE' | 'LISTENER' | 'SPEAKER'
export type Participant = { socketId: string; userId: string; name: string; role: Role; micEnabled: boolean; raisedHand: boolean; muted: boolean }
const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'

export function useWebRtcRoom(roomId: string | null, user: { id: string; name: string; role: Role } | null) {
  const socketRef = useRef<Socket | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const peers = useRef(new Map<string, RTCPeerConnection>())
  const remoteAudio = useRef(new Map<string, HTMLAudioElement>())
  const [socket, setSocket] = useState<Socket | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [micEnabled, setMicEnabled] = useState(false)
  const [connection, setConnection] = useState('Offline')
  const [error, setError] = useState('')
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    if (!roomId || !user) return
    const current = io(socketUrl, { auth: { token: localStorage.getItem('212audio-token') }, transports: ['websocket', 'polling'] })
    socketRef.current = current
    setSocket(current)

    const syncPeers = async (nextParticipants: Participant[]) => {
      if (!current.id) return
      for (const person of nextParticipants) {
        if (person.socketId === current.id || person.muted || !person.micEnabled && person.role !== 'HOST') continue
        const receiveOnly = !localStream.current
        if (receiveOnly || current.id < person.socketId) {
          const peer = await createPeer(person.socketId)
          if (!peer.localDescription) {
            const offer = await peer.createOffer()
            await peer.setLocalDescription(offer)
            current.emit('webrtc:offer', { target: person.socketId, offer })
          }
        }
      }
    }

    current.on('connect', () => { setConnection('Connected'); current.emit('room:join', { roomId, userId: user.id, name: user.name, role: user.role }) })
    current.on('connect_error', () => setConnection('Connection failed'))
    current.on('room:error', ({ message }: { message: string }) => { setConnection('Unavailable'); setError(message) })
    current.on('room:ended', () => { setEnded(true); setConnection('Ended') })
    current.on('room:state', (next: Participant[]) => { setParticipants(next); void syncPeers(next) })
    current.on('room:peer-left', ({ socketId }: { socketId: string }) => closePeer(socketId))
    current.on('participant:removed', () => { setConnection('Removed'); setParticipants([]); localStream.current?.getTracks().forEach(track => { track.enabled = false }); setMicEnabled(false); peers.current.forEach(peer => peer.close()); peers.current.clear() })
    current.on('participant:mute-state', ({ muted }: { muted: boolean }) => { localStream.current?.getAudioTracks().forEach(track => { track.enabled = !muted }); setMicEnabled(!muted) })
    current.on('webrtc:offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const peer = await createPeer(from)
      await peer.setRemoteDescription(offer)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      current.emit('webrtc:answer', { target: from, answer })
    })
    current.on('webrtc:answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => { await peers.current.get(from)?.setRemoteDescription(answer) })
    current.on('webrtc:ice', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => { if (candidate) await peers.current.get(from)?.addIceCandidate(candidate) })

    return () => {
      current.emit('room:leave', { roomId })
      current.disconnect()
      localStream.current?.getTracks().forEach(track => track.stop())
      peers.current.forEach(peer => peer.close())
      peers.current.clear()
      remoteAudio.current.forEach(audio => { audio.pause(); audio.srcObject = null; audio.remove() })
      remoteAudio.current.clear()
      socketRef.current = null
      setSocket(null)
    }

    async function createPeer(target: string) {
      const existing = peers.current.get(target)
      if (existing) return existing
      const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      if (localStream.current) localStream.current.getTracks().forEach(track => peer.addTrack(track, localStream.current!))
      else peer.addTransceiver('audio', { direction: 'recvonly' })
      peer.onicecandidate = event => { if (event.candidate) current.emit('webrtc:ice', { target, candidate: event.candidate }) }
      peer.onconnectionstatechange = () => { if (peer.connectionState === 'failed' || peer.connectionState === 'closed') closePeer(target) }
      peer.ontrack = event => {
        let audio = remoteAudio.current.get(target)
        if (!audio) { audio = new Audio(); audio.autoplay = true; audio.setAttribute('playsinline', 'true'); audio.style.display = 'none'; document.body.appendChild(audio); remoteAudio.current.set(target, audio) }
        audio.srcObject = event.streams[0]
        void audio.play().catch(() => setError('Click the microphone or sound control once to enable remote audio.'))
      }
      peers.current.set(target, peer)
      return peer
    }

    function closePeer(target: string) {
      peers.current.get(target)?.close()
      peers.current.delete(target)
      const audio = remoteAudio.current.get(target)
      if (audio) { audio.pause(); audio.srcObject = null; audio.remove(); remoteAudio.current.delete(target) }
    }
  }, [roomId, user?.id, user?.name, user?.role])

  async function enableMicrophone() {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      localStream.current.getAudioTracks().forEach(track => { track.enabled = true })
      setMicEnabled(true)
      if (roomId) socketRef.current?.emit('participant:mute', { roomId, socketId: socketRef.current.id, muted: false })
    } catch { setError('Microphone permission is required to speak.') }
  }

  function toggleMicrophone() {
    const next = !micEnabled
    localStream.current?.getAudioTracks().forEach(track => { track.enabled = next })
    setMicEnabled(next)
    if (roomId) socketRef.current?.emit('participant:mute', { roomId, socketId: socketRef.current?.id, muted: !next })
  }

  return { participants, micEnabled, connection, error, ended, enableMicrophone, toggleMicrophone, socket }
}
