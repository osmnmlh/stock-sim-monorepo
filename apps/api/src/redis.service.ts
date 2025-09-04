import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.client = new Redis(url);
  }

  async get(key: string) {
    return this.client.get(key);
  }
  async setex(key: string, ttlSec: number, val: string) {
    return this.client.setex(key, ttlSec, val);
  }
}
