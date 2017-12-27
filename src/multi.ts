import Db, { RedisHash, RedisPrimitive, RedisArray } from "./db";
export type QueuedFunction = (db: Db) => Promise<any>;

export default class Multi {
  queue: QueuedFunction[];

  constructor() {
    this.queue = [];
  }

  async decr(key: string) {
    this.queue = this.queue.concat(async db => await db.decr(key));
    return "QUEUED";
  }

  async decrby(key: string, n: number) {
    this.queue = this.queue.concat(async db => await db.decrby(key, n));
    return "QUEUED";
  }

  async del(key: string) {
    this.queue = this.queue.concat(async db => await db.del(key));
    return "QUEUED";
  }

  async exists(key: string) {
    this.queue = this.queue.concat(async db => await db.exists(key));
    return "QUEUED";
  }

  async expire(key: string, seconds: number) {
    this.queue = this.queue.concat(async db => await db.expire(key, seconds));
    return "QUEUED";
  }

  async get(key: string) {
    this.queue = this.queue.concat(async db => await db.get(key));
    return "QUEUED";
  }

  async hget(key: string, field: string) {
    this.queue = this.queue.concat(async db => await db.hget(key, field));
    return "QUEUED";
  }

  async hgetall(key: string) {
    this.queue = this.queue.concat(async db => await db.hgetall(key));
    return "QUEUED";
  }

  async hincrby(key: string, field: string, n: number) {
    this.queue = this.queue.concat(async db => await db.hincrby(key, field, n));
    return "QUEUED";
  }

  async hincrbyfloat(key: string, field: string, n: number) {
    this.queue = this.queue.concat(
      async db => await db.hincrbyfloat(key, field, n)
    );
    return "QUEUED";
  }

  async hmget(key: string, fields: string[]) {
    this.queue = this.queue.concat(async db => await db.hmget(key, fields));
    return "QUEUED";
  }

  async hmset(key: string, newObj: RedisHash) {
    this.queue = this.queue.concat(async db => await db.hmset(key, newObj));
    return "QUEUED";
  }

  async hset(key: string, field: string, value: RedisPrimitive) {
    this.queue = this.queue.concat(
      async db => await db.hset(key, field, value)
    );
    return "QUEUED";
  }

  async incr(key: string) {
    this.queue = this.queue.concat(async db => await db.incr(key));
    return "QUEUED";
  }

  async incrby(key: string, n: number) {
    this.queue = this.queue.concat(async db => await db.incrby(key, n));
    return "QUEUED";
  }

  async incrbyfloat(key: string, n: number) {
    this.queue = this.queue.concat(async db => await db.incrbyfloat(key, n));
    return "QUEUED";
  }

  async keys(_pattern: string) {
    this.queue = this.queue.concat(async db => await db.keys(_pattern));
    return "QUEUED";
  }

  async lindex(key: string, index: number) {
    this.queue = this.queue.concat(async db => await db.lindex(key, index));
    return "QUEUED";
  }

  async llen(key: string) {
    this.queue = this.queue.concat(async db => await db.llen(key));
    return "QUEUED";
  }

  async lpush(key: string, list: RedisArray) {
    this.queue = this.queue.concat(async db => await db.lpush(key, list));
    return "QUEUED";
  }

  async lrange(key: string, _from: number, _to: number) {
    this.queue = this.queue.concat(
      async db => await db.lrange(key, _from, _to)
    );
    return "QUEUED";
  }

  async lrem(key: string, value: RedisPrimitive) {
    this.queue = this.queue.concat(async db => await db.lrem(key, value));
    return "QUEUED";
  }

  async lset(key: string, _index: number, value: RedisPrimitive) {
    this.queue = this.queue.concat(
      async db => await db.lset(key, _index, value)
    );
    return "QUEUED";
  }

  async ltrim(key: string, _from: number, _to: number) {
    this.queue = this.queue.concat(async db => await db.ltrim(key, _from, _to));
    return "QUEUED";
  }

  async rename(from: string, to: string) {
    this.queue = this.queue.concat(async db => await db.rename(from, to));
    return "QUEUED";
  }

  async rpush(key: string, list: RedisArray) {
    this.queue = this.queue.concat(async db => await db.rpush(key, list));
    return "QUEUED";
  }

  async scan(cursorId : number, _pattern: string, _count: number) {
    this.queue = this.queue.concat(
      async db => await db.scan(cursorId, _pattern, _count)
    );
    return "QUEUED";
  }

  async set(key: string, value: RedisPrimitive, expiry?: number) {
    this.queue = this.queue.concat(
      async db => await db.set(key, value, expiry)
    );
    return "QUEUED";
  }

  async strlen(key: string) {
    this.queue = this.queue.concat(async db => await db.strlen(key));
    return "QUEUED";
  }
}
