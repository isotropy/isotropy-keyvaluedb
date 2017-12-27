import Db, { UnsavedRedisObject, RedisValue } from "./db";

export default class Redis {
  originalObjects: UnsavedRedisObject<RedisValue>[];
  db: Db;

  constructor(objects: UnsavedRedisObject<RedisValue>[]) {
    this.originalObjects = objects;
    this.__reset();
  }

  __reset() {
    this.db = new Db(this, this.originalObjects);
  }

  async open() {
    await this.db.open();
    return this.db;
  }
}
