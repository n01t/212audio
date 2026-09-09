import { Schema, model } from 'mongoose'

export type UserRole = 'HOST' | 'AUDIENCE'
const userSchema = new Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true }, passwordHash: { type: String, required: true }, role: { type: String, enum: ['HOST', 'AUDIENCE'], default: 'AUDIENCE' } }, { timestamps: true })
export const User = model('User', userSchema)
