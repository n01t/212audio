import { Router } from 'express'
import { LiveRoom } from '../models/LiveRoom.js'
import { Show } from '../models/Show.js'
import { requireAuth } from '../middleware/auth.js'
const router = Router()
router.post('/start', requireAuth, async (req, res) => { const show = await Show.findOne({ _id: req.body.showId, creator: req.auth!.sub }); if (!show) return res.status(404).json({ message: 'Show not found.' }); const existing = await LiveRoom.findOne({ show: show.id, status: 'LIVE' }); if (existing) return res.json(existing); const room = await LiveRoom.create({ show: show.id, host: req.auth!.sub, status: 'LIVE', startedAt: new Date() }); show.isLive = true; await show.save(); res.status(201).json(room) })
router.post('/:id/end', requireAuth, async (req, res) => { const room = await LiveRoom.findOneAndUpdate({ _id: req.params.id, host: req.auth!.sub, status: 'LIVE' }, { status: 'ENDED', endedAt: new Date() }, { new: true }); if (!room) return res.status(404).json({ message: 'Live room not found.' }); await Show.findByIdAndUpdate(room.show, { isLive: false }); res.json(room) })
router.get('/live', async (_req, res) => res.json(await LiveRoom.find({ status: 'LIVE' }).populate('show', 'title description artwork').populate('host', 'name')))
export default router
