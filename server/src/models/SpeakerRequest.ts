import { Schema, model } from 'mongoose'
const speakerRequestSchema = new Schema({ room: { type: Schema.Types.ObjectId, ref: 'LiveRoom', required: true, index: true }, participant: { type: Schema.Types.ObjectId, ref: 'Participant', required: true }, status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' } }, { timestamps: true })
export const SpeakerRequest = model('SpeakerRequest', speakerRequestSchema)
