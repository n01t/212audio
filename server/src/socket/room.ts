import type { Server, Socket } from 'socket.io'
import { LiveRoom } from '../models/LiveRoom.js'
import { Participant } from '../models/Participant.js'
import { Show } from '../models/Show.js'
import { SpeakerRequest } from '../models/SpeakerRequest.js'

type Role = 'HOST' | 'LISTENER' | 'SPEAKER'
type RoomParticipant = { socketId: string; userId: string; name: string; role: Role; micEnabled: boolean; raisedHand: boolean; muted: boolean; databaseId: string }
const rooms = new Map<string, Map<string, RoomParticipant>>()
const state = (roomId: string) => [...(rooms.get(roomId)?.values() ?? [])].map(({ databaseId: _databaseId, ...participant }) => participant)

export function registerRoomEvents(io: Server, socket: Socket) {
  socket.on('room:join', async ({ roomId, userId, name }: { roomId: string; userId: string; name: string }) => {
    const authUserId = socket.data.auth?.sub
    if (!authUserId || authUserId !== userId) return socket.emit('room:error', { message: 'You are not authorized to join this room.' })
    const room = await LiveRoom.findOne({ _id: roomId, status: 'LIVE' })
    if (!room) return socket.emit('room:error', { message: 'This room is no longer live.' })
    if (!rooms.has(roomId)) rooms.set(roomId, new Map())
    const role: Role = String(room.host) === authUserId ? 'HOST' : 'LISTENER'
    const databaseParticipant = await Participant.create({ room: room.id, user: authUserId, role, status: 'CONNECTED', micEnabled: false })
    const participant = { socketId: socket.id, userId: authUserId, name, role, micEnabled: false, raisedHand: false, muted: false, databaseId: databaseParticipant.id }
    rooms.get(roomId)!.set(socket.id, participant)
    socket.data.roomId = roomId
    socket.join(roomId)
    socket.to(roomId).emit('room:peer-joined', { participant: stripDatabaseId(participant) })
    io.to(roomId).emit('room:state', state(roomId))
  })

  socket.on('room:leave', async ({ roomId }: { roomId: string }) => leave(io, socket, roomId, 'DISCONNECTED'))
  socket.on('speaker:raise', async ({ roomId }: { roomId: string }) => {
    const person = findParticipant(roomId, socket.id)
    if (!person || person.role !== 'LISTENER') return
    await Participant.findByIdAndUpdate(person.databaseId, { status: 'CONNECTED' })
    await SpeakerRequest.findOneAndUpdate({ room: roomId, participant: person.databaseId, status: 'PENDING' }, { room: roomId, participant: person.databaseId }, { upsert: true, new: true })
    update(io, roomId, socket.id, { raisedHand: true })
  })
  socket.on('speaker:admit', async ({ roomId, socketId }: { roomId: string; socketId: string }) => {
    if (!isHost(roomId, socket.id)) return
    const person = findParticipant(roomId, socketId)
    if (!person) return
    await Participant.findByIdAndUpdate(person.databaseId, { role: 'SPEAKER', status: 'CONNECTED', micEnabled: false })
    await SpeakerRequest.findOneAndUpdate({ room: roomId, participant: person.databaseId, status: 'PENDING' }, { status: 'APPROVED' })
    update(io, roomId, socketId, { role: 'SPEAKER', raisedHand: false, micEnabled: false, muted: false })
  })
  socket.on('participant:mute', async ({ roomId, socketId, muted }: { roomId: string; socketId: string; muted: boolean }) => {
    if (socketId !== socket.id && !isHost(roomId, socket.id)) return
    const person = findParticipant(roomId, socketId)
    if (!person) return
    await Participant.findByIdAndUpdate(person.databaseId, { status: muted ? 'MUTED' : 'CONNECTED', micEnabled: !muted })
    if (socketId !== socket.id) io.to(socketId).emit('participant:mute-state', { muted })
    update(io, roomId, socketId, { muted, micEnabled: !muted })
  })
  socket.on('participant:remove', async ({ roomId, socketId }: { roomId: string; socketId: string }) => {
    if (!isHost(roomId, socket.id)) return
    const person = findParticipant(roomId, socketId)
    if (person) await Participant.findByIdAndUpdate(person.databaseId, { status: 'REMOVED', micEnabled: false })
    io.to(socketId).emit('participant:removed')
    await leave(io, io.sockets.sockets.get(socketId), roomId, 'REMOVED')
  })
  socket.on('room:end', async ({ roomId }: { roomId: string }) => {
    if (!isHost(roomId, socket.id)) return
    const room = await LiveRoom.findOneAndUpdate({ _id: roomId, host: socket.data.auth.sub, status: 'LIVE' }, { status: 'ENDED', endedAt: new Date() }, { new: true })
    if (!room) return
    await Show.findByIdAndUpdate(room.show, { isLive: false })
    await Participant.updateMany({ room: roomId, status: { $in: ['CONNECTED', 'MUTED'] } }, { status: 'DISCONNECTED', micEnabled: false })
    io.to(roomId).emit('room:ended')
    for (const peer of [...(rooms.get(roomId)?.keys() ?? [])]) await leave(io, io.sockets.sockets.get(peer), roomId, 'DISCONNECTED')
  })
  socket.on('webrtc:offer', ({ target, offer }: { target: string; offer: RTCSessionDescriptionInit }) => forward(roomForSocket(socket), socket, target, 'webrtc:offer', { from: socket.id, offer }))
  socket.on('webrtc:answer', ({ target, answer }: { target: string; answer: RTCSessionDescriptionInit }) => forward(roomForSocket(socket), socket, target, 'webrtc:answer', { from: socket.id, answer }))
  socket.on('webrtc:ice', ({ target, candidate }: { target: string; candidate: RTCIceCandidateInit }) => forward(roomForSocket(socket), socket, target, 'webrtc:ice', { from: socket.id, candidate }))
  socket.on('disconnect', async () => { const roomId = roomForSocket(socket); if (roomId) await leave(io, socket, roomId, 'DISCONNECTED') })
}

function stripDatabaseId(participant: RoomParticipant) { const { databaseId: _databaseId, ...publicParticipant } = participant; return publicParticipant }
function roomForSocket(socket: Socket) { return socket.data.roomId as string | undefined }
function findParticipant(roomId: string, socketId: string) { return rooms.get(roomId)?.get(socketId) }
function isHost(roomId: string, socketId: string) { return findParticipant(roomId, socketId)?.role === 'HOST' }
function forward(roomId: string | undefined, socket: Socket, target: string, event: string, payload: object) { if (roomId && findParticipant(roomId, target)) socket.to(target).emit(event, payload) }
function update(io: Server, roomId: string, socketId: string, patch: Partial<RoomParticipant>) { const person = rooms.get(roomId)?.get(socketId); if (person) { Object.assign(person, patch); io.to(roomId).emit('room:state', state(roomId)) } }
async function leave(io: Server, socket: Socket | undefined, roomId: string, status: 'DISCONNECTED' | 'REMOVED') {
  if (!socket) return
  const person = rooms.get(roomId)?.get(socket.id)
  if (person) await Participant.findByIdAndUpdate(person.databaseId, { status, micEnabled: false })
  rooms.get(roomId)?.delete(socket.id)
  socket.to(roomId).emit('room:peer-left', { socketId: socket.id })
  socket.leave(roomId)
  io.to(roomId).emit('room:state', state(roomId))
  if (!rooms.get(roomId)?.size) rooms.delete(roomId)
}
