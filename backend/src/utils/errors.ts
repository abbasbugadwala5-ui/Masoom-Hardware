export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest    = (msg: string, details?: unknown) => new AppError(msg, 400, 'BAD_REQUEST', details);
export const Unauthorized  = (msg = 'Unauthorized')           => new AppError(msg, 401, 'UNAUTHORIZED');
export const Forbidden     = (msg = 'Forbidden')              => new AppError(msg, 403, 'FORBIDDEN');
export const NotFound      = (msg = 'Not found')              => new AppError(msg, 404, 'NOT_FOUND');
export const Conflict      = (msg: string)                    => new AppError(msg, 409, 'CONFLICT');
export const Unprocessable = (msg: string, details?: unknown) => new AppError(msg, 422, 'UNPROCESSABLE', details);
