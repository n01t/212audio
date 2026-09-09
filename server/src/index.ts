import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'node:http'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import authRoutes from './routes/auth.js'
import showRoutes from './routes/shows.js'
import roomRoutes from './routes/rooms.js'
import { registerRoomEvents } from './socket/room.js'
import jwt from 'jsonwebtoken'

declare global { namespace Express { interface Request { auth?: { sub: string; role: string; name?: string } } } }
const app = express(); const server = http.createServer(app)
const allowedOrigins = [process.env.CLIENT_URL ?? 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']
const corsOptions = { origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => callback(null, !origin || allowedOrigins.includes(origin)) }
const io = new Server(server, { cors: corsOptions })
io.use((socket, next) => { const token = socket.handshake.auth?.token; if (!token) return next(new Error('Authentication required.')); try { socket.data.auth = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret') as { sub: string; role: string; name: string }; next() } catch { next(new Error('Invalid or expired token.')) } })
app.use(cors(corsOptions)); app.use(express.json())
app.get('/api/health', (_req, res) => res.json({ ok: true, service: '212audio-server' }))
app.use('/api/auth', authRoutes); app.use('/api/shows', showRoutes); app.use('/api/rooms', roomRoutes)
io.on('connection', socket => registerRoomEvents(io, socket))
const port = Number(process.env.PORT ?? 4000)
mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/212audio').then(() => server.listen(port, () => console.log(`212Audio server listening on ${port}`))).catch(error => { console.error('MongoDB connection failed', error); process.exit(1) })
