import { Router } from 'express'
import { Show } from '../models/Show.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
const router = Router()
router.use(optionalAuth)
router.get('/', async (req, res) => { const filter = req.auth?.sub ? { creator: req.auth.sub } : {}; res.json(await Show.find(filter).populate('creator', 'name').sort({ createdAt: -1 })) })
router.post('/', requireAuth, async (req, res) => { const { title, description, artwork, category } = req.body; if (!title?.trim()) return res.status(400).json({ message: 'Title is required.' }); const show = await Show.create({ title: title.trim(), description, artwork, category, creator: req.auth!.sub }); res.status(201).json(show) })
router.patch('/:id', requireAuth, async (req, res) => { const show = await Show.findOneAndUpdate({ _id: req.params.id, creator: req.auth!.sub }, { $set: req.body }, { new: true }); if (!show) return res.status(404).json({ message: 'Show not found.' }); res.json(show) })
export default router
