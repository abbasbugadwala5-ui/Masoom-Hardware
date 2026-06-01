import pino from 'pino';
import { env, isProd } from './env';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
      },
  base: { env: env.NODE_ENV, service: 'masoom-api' },
});
