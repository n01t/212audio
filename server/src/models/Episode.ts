import { Schema, model } from 'mongoose'
const episodeSchema = new Schema({ title: String, description: String, show: { type: Schema.Types.ObjectId, ref: 'Show' }, creator: { type: Schema.Types.ObjectId, ref: 'User' }, recordingUrl: String, durationSeconds: Number }, { timestamps: true })
export const Episode = model('Episode', episodeSchema)
