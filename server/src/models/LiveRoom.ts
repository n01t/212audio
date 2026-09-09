import { Schema, model } from 'mongoose'
const liveRoomSchema = new Schema({ show: { type: Schema.Types.ObjectId, ref: 'Show', required: true }, host: { type: Schema.Types.ObjectId, ref: 'User', required: true }, status: { type: String, enum: ['LIVE', 'ENDED'], default: 'LIVE', index: true }, startedAt: Date, endedAt: Date }, { timestamps: true })
export const LiveRoom = model('LiveRoom', liveRoomSchema)
