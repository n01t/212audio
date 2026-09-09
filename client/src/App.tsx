import { useEffect, useState } from 'react'
import { ArrowRight, Hand, Headphones, Mic, MicOff, Plus, Radio, ShieldCheck, Square, Users, Volume2 } from 'lucide-react'
import { useWebRtcRoom, type Participant } from './hooks/useWebRtcRoom'
type Screen = 'landing' | 'auth' | 'dashboard' | 'room'
type AuthMode = 'login' | 'register'
type Role = 'HOST' | 'AUDIENCE' | 'LISTENER' | 'SPEAKER'
type User = { id: string; name: string; email: string; role: 'HOST' | 'AUDIENCE' }
type Show = { _id: string; title: string; description?: string; artwork?: string; category?: string; isLive: boolean; creator?: { name: string } }
type LiveRoom = { _id: string; show: Show; host: { name: string }; status: 'LIVE' | 'ENDED' }

const api = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const token = localStorage.getItem('212audio-token')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${api}${path}`, { ...options, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? 'Request failed.')
  return body as T
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [user, setUser] = useState<User | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([])
  const [activeRoom, setActiveRoom] = useState<LiveRoom | null>(null)
  const [roomRole, setRoomRole] = useState<Role>('LISTENER')
  const [authChecked, setAuthChecked] = useState(false)
  const [appError, setAppError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('212audio-token')
    if (!token) { setAuthChecked(true); return }
    request<User>('/auth/me').then(account => { setUser(account); setScreen('dashboard') }).catch(() => localStorage.removeItem('212audio-token')).finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => { if (user && screen === 'dashboard') void loadDashboard() }, [user, screen])

  async function loadDashboard() {
    try { const [ownedShows, live] = await Promise.all([request<Show[]>('/shows'), request<LiveRoom[]>('/rooms/live')]); setShows(ownedShows); setLiveRooms(live); setAppError('') } catch (error) { setAppError(error instanceof Error ? error.message : 'Unable to load dashboard.') }
  }

  async function authenticate(form: HTMLFormElement) {
    try {
      const data = Object.fromEntries(new FormData(form))
      const result = await request<{ token: string; user: User }>(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify(data) })
      localStorage.setItem('212audio-token', result.token)
      setUser(result.user); setScreen('dashboard'); setAppError('')
    } catch (error) { setAppError(error instanceof Error ? error.message : 'Authentication failed.') }
  }

  function openExplore() { if (user) setScreen('dashboard'); else { setAuthMode('login'); setScreen('auth') } }
  function logout() { localStorage.removeItem('212audio-token'); setUser(null); setShows([]); setLiveRooms([]); setActiveRoom(null); setScreen('landing') }
  function enterRoom(room: LiveRoom, role: Role) { setActiveRoom(room); setRoomRole(role); setScreen('room') }

  if (!authChecked) return <main className="landing" />
  if (screen === 'landing') return <Landing onStart={() => { setAuthMode('register'); setScreen('auth') }} onExplore={openExplore} />
  if (screen === 'auth') return <Auth mode={authMode} setMode={mode => { setAuthMode(mode); setAppError('') }} error={appError} onSubmit={authenticate} />
  if (!user) return <Auth mode="login" setMode={setAuthMode} error="Please sign in to continue." onSubmit={authenticate} />
  if (screen === 'room' && activeRoom) return <LiveRoomView room={activeRoom} user={user} initialRole={roomRole} onLeave={() => { setScreen('dashboard'); void loadDashboard() }} onEnded={() => { setScreen('dashboard'); void loadDashboard() }} />
  return <Dashboard user={user} shows={shows} liveRooms={liveRooms} error={appError} onRefresh={loadDashboard} onEnterRoom={enterRoom} onLogout={logout} />
}

function Landing({ onStart, onExplore }: { onStart: () => void; onExplore: () => void }) { return <main className="landing"><nav className="landing-nav"><a className="brand" href="#"><span>212</span>audio</a><div><button className="ghost" onClick={onExplore}>Explore shows</button><button className="outline" onClick={onStart}>Sign in</button></div></nav><section className="hero"><div className="hero-copy"><p className="kicker">LIVE AUDIO / REAL CONVERSATIONS</p><h1>Your voice.<br /><em>Your audience.</em><br />Live.</h1><p className="hero-text">A better room for the conversations that matter. Broadcast live, bring people on stage, and turn every session into a show.</p><div className="hero-actions"><button className="primary" onClick={onStart}>Start broadcasting <ArrowRight size={16} /></button><button className="text-button" onClick={onExplore}>Listen live <Headphones size={16} /></button></div><div className="proof"><div className="proof-avatars"><span>JD</span><span>SC</span><span>MR</span><span>+</span></div><p>Join the room for real conversations</p></div></div><div className="hero-art"><div className="signal-ring ring-one"></div><div className="signal-ring ring-two"></div><div className="signal-ring ring-three"></div><div className="radio-card"><div className="radio-top"><span className="live-dot">● ON AIR</span><span>LIVE</span></div><div className="host-orb">212</div><h3>Live conversations</h3><p>made for participation</p><div className="bars">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 17) % 55)}%` }} />)}</div><div className="radio-bottom"><span><Users size={14} /> Listen live</span><button onClick={onExplore}>Join room <ArrowRight size={14} /></button></div></div></div></section><section className="landing-strip"><div><Radio size={19} /><strong>Live shows, built for participation.</strong></div><span>Host a room. Invite a voice. Make something happen.</span><button onClick={onExplore}>See what’s live <ArrowRight size={14} /></button></section></main> }

function Auth({ mode, setMode, onSubmit, error }: { mode: AuthMode; setMode: (mode: AuthMode) => void; onSubmit: (form: HTMLFormElement) => void; error: string }) { return <main className="auth-page"><div className="auth-side"><a className="brand" href="#"><span>212</span>audio</a><div><p className="kicker">MAKE ROOM FOR THE ROOM</p><h1>Conversations are better when everyone can be heard.</h1></div><small>212Audio · Live audio for real people</small></div><div className="auth-card"><button className="back-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New to 212Audio? Create an account' : 'Already have an account? Sign in'}</button><p className="kicker">{mode === 'login' ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}</p><h2>{mode === 'login' ? 'Good to hear you.' : 'Find your people.'}</h2><p className="muted">{mode === 'login' ? 'Sign in to get back to your rooms.' : 'Start a room or join the conversation.'}</p><form onSubmit={event => { event.preventDefault(); void onSubmit(event.currentTarget) }}>{mode === 'register' && <label>Name<input name="name" required placeholder="Your name" /></label>}<label>Email<input name="email" type="email" required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" required minLength={6} placeholder="At least 6 characters" /></label>{mode === 'register' && <label>I'm here to <select name="role" defaultValue="AUDIENCE"><option value="AUDIENCE">Listen and join rooms</option><option value="HOST">Host live shows</option></select></label>}{error && <p className="form-error">{error}</p>}<button className="primary wide" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button></form><p className="fine-print"><ShieldCheck size={14} /> Your account and room data stay yours.</p></div></main> }

function Dashboard({ user, shows, liveRooms, error, onRefresh, onEnterRoom, onLogout }: { user: User; shows: Show[]; liveRooms: LiveRoom[]; error: string; onRefresh: () => Promise<void>; onEnterRoom: (room: LiveRoom, role: Role) => void; onLogout: () => void }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Show | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const liveRoom = liveRooms.find(room => room.status === 'LIVE')
  async function saveShow(form: HTMLFormElement) { setSaving(true); setFormError(''); try { const data = Object.fromEntries(new FormData(form)); await request<Show>(editing ? `/shows/${editing._id}` : '/shows', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(data) }); setFormOpen(false); setEditing(null); await onRefresh() } catch (saveError) { setFormError(saveError instanceof Error ? saveError.message : 'Unable to save show.') } finally { setSaving(false) } }
  async function startLive(show: Show) { try { const room = await request<LiveRoom>('/rooms/start', { method: 'POST', body: JSON.stringify({ showId: show._id }) }); onEnterRoom({ ...room, show, host: { name: user.name } }, 'HOST') } catch (startError) { setFormError(startError instanceof Error ? startError.message : 'Unable to start live room.') } }
  return <main className="dashboard"><header className="app-nav"><a className="brand" href="#"><span>212</span>audio</a><div className="nav-links"><a className="active">Overview</a><a>My shows</a><a>Episodes</a><a>Audience</a></div><div className="nav-user"><span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span><button onClick={onLogout}>Sign out</button></div></header><section className="dashboard-body"><div className="dash-heading"><div><p className="kicker">CREATOR WORKSPACE</p><h1>Make room for the room.</h1><p className="muted">Your live conversations, all in one place.</p></div><button className="primary" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={17} /> Create a show</button></div>{error && <p className="form-error">{error}</p>}{formOpen && <form className="show-form-panel" onSubmit={event => { event.preventDefault(); void saveShow(event.currentTarget) }}><input name="title" required defaultValue={editing?.title ?? ''} placeholder="Show title" /><textarea name="description" defaultValue={editing?.description ?? ''} placeholder="What is this show about?" /><input name="category" defaultValue={editing?.category ?? ''} placeholder="Category" /><div><button className="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create show'}</button><button className="outline" type="button" onClick={() => setFormOpen(false)}>Cancel</button></div>{formError && <p className="form-error">{formError}</p>}</form>}{liveRoom && <div className="live-callout"><div className="live-label"><span className="pulse"></span><div><p>LIVE NOW</p><strong>{liveRoom.show.title}</strong><small>{liveRoom.show.description}</small></div></div><button className="dark-button" onClick={() => onEnterRoom(liveRoom, liveRoom.host.name === user.name ? 'HOST' : 'LISTENER')}>Join live room <ArrowRight size={15} /></button></div>}<div className="section-title"><div><h2>Your shows</h2><p className="muted">A home for every idea.</p></div><button className="link-button" onClick={() => { setEditing(null); setFormOpen(true) }}>+ New show</button></div><div className="show-cards">{shows.map(show => <article className="show-card" key={show._id}><div className="show-art"><span>{show.title.split(' ')[0]}<br /><em>{show.title.split(' ').slice(1).join(' ')}</em></span><small>{show.isLive ? '● LIVE' : show.category ?? 'SHOW'}</small></div><div className="card-copy"><h3>{show.title}</h3><p>{show.description || 'A new room for your next conversation.'}</p><div className="card-stats"><span>{show.isLive ? 'LIVE NOW' : 'OFFLINE'}</span><span>{show.category ?? 'General'}</span></div><button className="outline wide" onClick={() => show.isLive && liveRoom ? onEnterRoom(liveRoom, 'HOST') : void startLive(show)}>{show.isLive ? 'Open live studio' : 'Start live'}</button><button className="link-button" onClick={() => { setEditing(show); setFormOpen(true) }}>Edit show</button></div></article>)}{shows.length === 0 && <div className="empty-state"><h2>Create your first show</h2><p className="muted">Your saved shows will appear here.</p><button className="primary" onClick={() => setFormOpen(true)}>Create a show</button></div>}</div><div className="section-title"><div><p className="kicker">DISCOVER</p><h2>Find a room to join.</h2><p className="muted">Listen first. Raise your hand when you’re ready.</p></div></div>{liveRooms.length === 0 && <p className="muted">No live rooms right now.</p>}{liveRooms.map(room => <div className="live-callout" key={room._id}><div className="live-label"><span className="pulse"></span><div><p>LIVE NOW</p><strong>{room.show.title}</strong><small>Hosted by {room.host.name}</small></div></div><button className="dark-button" onClick={() => onEnterRoom(room, 'LISTENER')}>Join live room <ArrowRight size={15} /></button></div>)}</section></main>
}

function LiveRoomView({ room, user, initialRole, onLeave, onEnded }: { room: LiveRoom; user: User; initialRole: Role; onLeave: () => void; onEnded: () => void }) {
  const [roomRole, setRoomRole] = useState(initialRole)
  const [raised, setRaised] = useState(false)
  const { participants, micEnabled, connection, error, ended, enableMicrophone, toggleMicrophone, socket } = useWebRtcRoom(room._id, user.role === 'HOST' ? { ...user, role: 'HOST' } : { ...user, role: 'AUDIENCE' })
  const own = participants.find(person => person.userId === user.id)
  useEffect(() => { if (own?.role) setRoomRole(own.role) }, [own?.role])
  useEffect(() => { if (ended) onEnded() }, [ended, onEnded])
  const host = roomRole === 'HOST'
  const requestRaise = () => { socket?.emit('speaker:raise', { roomId: room._id }); setRaised(true) }
  const admit = (person: Participant) => socket?.emit('speaker:admit', { roomId: room._id, socketId: person.socketId })
  const mute = (person: Participant) => socket?.emit('participant:mute', { roomId: room._id, socketId: person.socketId, muted: !person.muted })
  const remove = (person: Participant) => socket?.emit('participant:remove', { roomId: room._id, socketId: person.socketId })
  const end = () => socket?.emit('room:end', { roomId: room._id })
  return <main className="room-page"><header className="room-nav"><a className="brand" href="#"><span>212</span>audio</a><div className="room-nav-title"><span className="live-dot">● LIVE</span><strong>{room.show.title}</strong><span>ROOM / {room._id}</span></div><button className="outline" onClick={onLeave}>Leave room</button></header><div className="room-layout"><section className="stage-panel"><div className="stage-top"><div><p className="kicker">LIVE STUDIO</p><h1>{ended ? 'Broadcast ended.' : host ? 'Your room is live.' : 'You’re in the room.'}</h1><p className="muted">{host ? 'Bring the right voices on stage.' : 'Listen in, then join when the moment feels right.'}</p></div><div className="connection"><span className="pulse"></span>{connection}</div></div><div className="stage-center"><div className="stage-ring"><div className="stage-avatar">{room.host.name.slice(0, 2).toUpperCase()}<span>♩</span></div></div><h2>{room.host.name}</h2><p>Host · {room.show.title}</p><div className="audio-bars">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ height: `${20 + ((index * 13) % 65)}%` }} />)}</div></div><div className="stage-actions"><button className="control" onClick={() => void enableMicrophone()} disabled={ended || roomRole === 'LISTENER'}><Mic size={17} /> {micEnabled ? 'Microphone on' : 'Start microphone'}</button><button className="control" onClick={toggleMicrophone} disabled={!micEnabled}><MicOff size={17} /> Mute</button><button className="control"><Volume2 size={17} /> Sound check</button>{host && <button className="control danger" onClick={end} disabled={ended}><Square size={14} /> End live</button>}</div>{error && <p className="form-error room-error">{error}</p>}</section><aside className="room-sidebar"><div className="panel-heading"><div><h2>In the room <span className="count-pill">{participants.length}</span></h2><p>Listeners and speakers</p></div></div>{participants.map(person => <div className="participant" key={person.socketId}><div><strong>{person.name}{person.userId === user.id ? ' (you)' : ''}</strong><small>{person.role} {person.muted ? '· MUTED' : ''}</small></div><div>{host && person.userId !== user.id && person.raisedHand && <button onClick={() => admit(person)}>Admit</button>}{host && person.userId !== user.id && person.role === 'SPEAKER' && <><button onClick={() => mute(person)}>{person.muted ? 'Unmute' : 'Mute'}</button><button onClick={() => remove(person)}>Remove</button></>}</div></div>)}{!host && roomRole === 'LISTENER' && <div className="request-callout"><Hand size={18} /><div><strong>{raised ? 'Hand raised' : 'Want to join in?'}</strong><small>{raised ? 'Waiting for the host to admit you.' : 'Raise your hand and the host will bring you on stage.'}</small></div><button onClick={requestRaise} disabled={raised}>Raise hand</button></div>}</aside></div></main>
}
