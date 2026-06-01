import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
  }
}

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && incoming.length > 0 ? incoming : nanoid(12);
  res.setHeader('x-request-id', req.id);
  next();
};
