import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType | null> => {
  try {
    const client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: 2000,
        reconnectStrategy: false,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    client.on('error', () => {
      // Redis 오류 무시 (선택적 의존성)
    });

    await client.connect();
    redisClient = client as RedisClientType;
    console.log('✅ Redis에 연결되었습니다.');
    return redisClient;
  } catch {
    console.log('⚠️  Redis 연결 실패 - Redis 없이 계속 진행합니다.');
    redisClient = null;
    return null;
  }
};

export const getRedisClient = () => redisClient;

export default redisClient;
