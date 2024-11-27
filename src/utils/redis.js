import { Redis } from 'ioredis';

const redis = new Redis({
  host: 'redis-10117.c246.us-east-1-4.ec2.redns.redis-cloud.com',
  port: 10117,
  password: 'SqyHZTbPHADrkAOk9W5eTetxWFqENRQY',
});

export const saveMatchesData = async (matches) => {
  const pipeline = redis.pipeline();

  for (const match of matches) {
    const matchDate = new Date(match.estimateStartTime)
      .toISOString()
      .split('T')[0];
    const key = `match:${matchDate}:${match.eventId}`;

    pipeline.set(key, JSON.stringify(match));
    pipeline.expire(key, 48 * 60 * 60); // 48hr expiry
  }

  await pipeline.exec();
};

export const getMatchData = async (key) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};