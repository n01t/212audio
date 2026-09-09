import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'

export type AuthClaims = { sub: string; role: string; name: string }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Authentication required.' })
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret') as AuthClaims
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try { req.auth = jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret') as AuthClaims } catch { /* public request */ }
  }
  next()
}
