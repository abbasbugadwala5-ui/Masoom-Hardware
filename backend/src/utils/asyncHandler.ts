import type { NextFunction, Request, Response } from 'express';

type Handler<Req = Request> = (req: Req, res: Response, next: NextFunction) => Promise<unknown> | unknown;

export const asyncHandler =
  <Req extends Request = Request>(fn: Handler<Req>) =>
  (req: Req, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
