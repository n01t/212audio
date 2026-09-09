import { Schema, model } from 'mongoose'
const participantSchema = new Schema({ room: { type: Schema.Types.ObjectId, ref: 'LiveRoom', required: true, index: true }, user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, role: { type: String, enum: ['HOST', 'LISTENER', 'SPEAKER'], required: true }, status: { type: String, enum: ['CONNECTED', 'MUTED', 'REMOVED', 'DISCONNECTED'], required: true }, micEnabled: { type: Boolean, default: false }, joinedAt: { type: Date, default: Date.now } }, { timestamps: true })
export const Participant = model('Participant', participantSchema)
