import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const tokenFor = (user: { id: string; role: string; name: string }) => jwt.sign({ sub: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET ?? 'dev-secret', { expiresIn: '7d' })
router.post('/register', async (req, res) => { try { const { name, email, password, role = 'AUDIENCE' } = req.body; if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required.' }); const exists = await User.findOne({ email }); if (exists) return res.status(409).json({ message: 'An account with that email already exists.' }); const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role }); res.status(201).json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } }) } catch { res.status(500).json({ message: 'Unable to create account.' }) } })
router.post('/login', async (req, res) => { const user = await User.findOne({ email: req.body.email }); if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password.' }); res.json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } }) })
router.get('/me', requireAuth, async (req, res) => { const user = await User.findById(req.auth!.sub).select('name email role'); if (!user) return res.status(401).json({ message: 'User no longer exists.' }); res.json({ id: user.id, name: user.name, email: user.email, role: user.role }) })
export default router
