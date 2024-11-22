import { Redis } from 'ioredis';

const redis = new Redis({
  host: 'redis-10117.c246.us-east-1-4.ec2.redns.redis-cloud.com',
  port: 10117,
  password: 'SqyHZTbPHADrkAOk9W5eTetxWFqENRQY',
});

export const saveMatchData = async (key, data) => {
  await redis.set(key, JSON.stringify(data));
  // Set 48hr expiry
  await redis.expire(key, 48 * 60 * 60);
};

export const getMatchData = async (key) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};
