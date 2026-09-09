import type { Request } from 'express'
declare global { namespace Express { interface Request { auth?: { sub: string; role: string } } } }
export {}
