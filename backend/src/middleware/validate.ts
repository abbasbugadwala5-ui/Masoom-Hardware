import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

type Source = 'body' | 'query' | 'params';

export const validate =
  <S extends ZodTypeAny>(schema: S, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    // attach parsed payload back so downstream sees the typed shape
    (req as Request & { validated?: Record<string, unknown> }).validated = {
      ...(req as Request & { validated?: Record<string, unknown> }).validated,
      [source]: parsed.data as z.infer<S>,
    };
    req[source] = parsed.data as never;
    next();
  };
