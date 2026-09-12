import type * as ioredis from 'ioredis';
import 'dotenv/config';
const brand = process.env.BRAND_NAME;

const APP_NAME = `{${brand}}`;
const PREFIX = 'prisma-stats';
const DAYS_TO_KEEP = 60;
const TTL_SECONDS = DAYS_TO_KEEP * 24 * 60 * 60;

const normalizeAction = (action: string) => action.replace(/^\$/, '');

export const buildPrismaStatKey = (
  date: string,
  model: string,
  operation: string,
): string => {
  // {CHAD}:prisma-statics:YYYY-MM-DD:model:findMany
  return `${APP_NAME}:${PREFIX}:${date}:${model}:${operation}`;
};

export const recordPrismaQueryStat = async (
  redis: ioredis.Redis | undefined,
  model: string,
  operation: string,
  now: Date = new Date(),
): Promise<void> => {
  if (!redis || redis.status !== 'ready') return;

  const date = now.toISOString().slice(0, 10); // UTC
  const op = normalizeAction(operation);

  const key = buildPrismaStatKey(date, model, op);

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, TTL_SECONDS);
  }
};
