import { Schema, model } from 'mongoose'
const showSchema = new Schema({ title: { type: String, required: true }, description: String, artwork: String, category: String, creator: { type: Schema.Types.ObjectId, ref: 'User', required: true }, isLive: { type: Boolean, default: false } }, { timestamps: true })
export const Show = model('Show', showSchema)
