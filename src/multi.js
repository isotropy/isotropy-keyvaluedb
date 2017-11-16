export default class Multi {
  constructor() {
    this.queue = [];
  }

  async decr() {
    this.queue = this.queue.concat(async db => await db.decr());
    return "QUEUED";
  }

  async decrby(key, n) {
    this.queue = this.queue.concat(async db => await db.decrby(key, n));
    return "QUEUED";
  }

  async del(key) {
    this.queue = this.queue.concat(async db => await db.del(key));
    return "QUEUED";
  }

  async exists(key) {
    this.queue = this.queue.concat(async db => await db.exists(key));
    return "QUEUED";
  }

  async expire(key, seconds) {
    this.queue = this.queue.concat(async db => await db.expire(key, seconds));
    return "QUEUED";
  }

  async get(key) {
    this.queue = this.queue.concat(async db => await db.get(key));
    return "QUEUED";
  }

  async hget(key, field) {
    this.queue = this.queue.concat(async db => await db.hget(key, field));
    return "QUEUED";
  }

  async hgetall(key) {
    this.queue = this.queue.concat(async db => await db.hgetall(key));
    return "QUEUED";
  }

  async hincrby(key, field, n) {
    this.queue = this.queue.concat(async db => await db.hincrby(key, field, n));
    return "QUEUED";
  }

  async hincrbyfloat(key, field, n) {
    this.queue = this.queue.concat(
      async db => await db.hincrbyfloat(key, field, n)
    );
    return "QUEUED";
  }

  async hmget(key, fields) {
    this.queue = this.queue.concat(async db => await db.hmget(key, fields));
    return "QUEUED";
  }

  async hmset(key, newObj) {
    this.queue = this.queue.concat(async db => await db.hmset(key, newObj));
    return "QUEUED";
  }

  async hset(key, field, value) {
    this.queue = this.queue.concat(
      async db => await db.hset(key, field, value)
    );
    return "QUEUED";
  }

  async incr(key) {
    this.queue = this.queue.concat(async db => await db.incr(key));
    return "QUEUED";
  }

  async incrby(key, n) {
    this.queue = this.queue.concat(async db => await db.incrby(key, n));
    return "QUEUED";
  }

  async incrbyfloat(key, n) {
    this.queue = this.queue.concat(async db => await db.incrbyfloat(key, n));
    return "QUEUED";
  }

  async keys(_pattern) {
    this.queue = this.queue.concat(async db => await db.keys(_pattern));
    return "QUEUED";
  }

  async lindex(key, index) {
    this.queue = this.queue.concat(async db => await db.lindex(key, index));
    return "QUEUED";
  }

  async llen(key) {
    this.queue = this.queue.concat(async db => await db.llen(key));
    return "QUEUED";
  }

  async lpush(key, list) {
    this.queue = this.queue.concat(async db => await db.lpush(key, list));
    return "QUEUED";
  }

  async lrange(key, _from, _to) {
    this.queue = this.queue.concat(
      async db => await db.lrange(key, _from, _to)
    );
    return "QUEUED";
  }

  async lrem(key, value) {
    this.queue = this.queue.concat(async db => await db.lrem(key, value));
    return "QUEUED";
  }

  async lset(key, _index, value) {
    this.queue = this.queue.concat(
      async db => await db.lset(key, _index, value)
    );
    return "QUEUED";
  }

  async ltrim(key, _from, _to) {
    this.queue = this.queue.concat(async db => await db.ltrim(key, _from, _to));
    return "QUEUED";
  }

  async rename(from, to) {
    this.queue = this.queue.concat(async db => await db.rename(from, to));
    return "QUEUED";
  }

  async rpush(key, list) {
    this.queue = this.queue.concat(async db => await db.rpush(key, list));
    return "QUEUED";
  }

  async scan(cursorId, _pattern, _count) {
    this.queue = this.queue.concat(
      async db => await db.scan(cursorId, _pattern, _count)
    );
    return "QUEUED";
  }

  async set(key, value, expiry) {
    this.queue = this.queue.concat(
      async db => await db.set(key, value, expiry)
    );
    return "QUEUED";
  }

  async strlen(key) {
    this.queue = this.queue.concat(async db => await db.strlen(key));
    return "QUEUED";
  }
}
