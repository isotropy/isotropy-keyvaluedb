import exception from "./exception";
import Redis from "./isotropy-redis";
import Multi from "./multi";

export type RedisPrimitive = string | number;

export type RedisArray = RedisPrimitive[];

export type RedisHash = { [key: string]: RedisPrimitive };

export type RedisValue = RedisPrimitive | RedisHash | RedisArray;

export type UnsavedRedisObject<T extends RedisValue> = {
  key: string;
  value: T;
  expiry?: number;
};

export type RedisObject<T extends RedisValue> = {
  __id: number;
  key: string;
  value: T;
  expiry: number;
};

export type RedisCursor = {
  __id: number;
  position: number;
};

function isPrimitive(val: any): val is RedisPrimitive {
  return typeof val === "string" || typeof val === "number";
}

function ensurePrimitive(
  obj: any,
  key: string
): RedisObject<RedisPrimitive> | never {
  return obj && isPrimitive(obj.value)
    ? obj
    : exception(
        `Expected the value of '${key}' to be a primitive but received ${
          obj
            ? isArray(obj.value)
              ? "array"
              : isHash(obj.value) ? "hash" : typeof obj.value
            : "undefined"
        }.`
      );
}

function isHash(val: any): val is Object {
  return typeof val === "object" && !Array.isArray(val);
}

function ensureHash(obj: any, key: string): RedisObject<RedisHash> | never {
  return obj && isHash(obj.value)
    ? obj
    : exception(
        `Expected the value of '${key}' to be a hash but received ${
          typeof obj !== "undefined" ? typeof obj.value : "undefined"
        }.`
      );
}

function isArray(val: any): val is RedisArray {
  return Array.isArray(val);
}

function ensureArray(obj: any, key: string): RedisObject<RedisArray> | never {
  return obj && isArray(obj.value)
    ? obj
    : exception(
        `Expected the value of '${key}' to be an array but received ${
          typeof obj !== "undefined" ? typeof obj.value : "undefined"
        }.`
      );
}

export default class Db {
  redis: Redis;
  objects: RedisObject<RedisValue>[];
  state: string;
  transaction?: Multi;
  idCounter: number;
  cursorIdCounter: number;
  cursors: RedisCursor[];

  constructor(redis: Redis, objects: UnsavedRedisObject<RedisValue>[]) {
    this.redis = redis;
    this.init(objects);
  }

  private init(objects: UnsavedRedisObject<RedisValue>[]) {
    this.state = "CLOSED";
    this.cursors = [];
    this.idCounter = 0;
    this.cursorIdCounter = 1;
    this.objects =
      objects && objects.length
        ? objects.map(x => ({ expiry: -1, ...x, __id: this.idCounter++ }))
        : [];
    this.transaction = undefined;
  }

  private addCursor(position: number) {
    this.cursors = this.cursors.concat({
      __id: this.cursorIdCounter++,
      position
    });
  }

  private addObject<T extends RedisValue>(obj: UnsavedRedisObject<T>) {
    this.objects = this.objects.concat({
      expiry: -1,
      ...obj,
      __id: this.idCounter++
    });
  }

  private replaceObject<TFrom extends RedisValue, TTo extends RedisValue>(
    obj: RedisObject<TFrom>,
    newObj: UnsavedRedisObject<TTo> | RedisObject<TTo>
  ) {
    this.objects = this.objects.map(o => (o === obj ? { ...o, ...newObj } : o));
  }

  private removeCursor(counter: number) {
    this.cursors = this.cursors.filter(x => x.__id === counter);
  }

  private withArray<T>(
    key: string,
    fn: (obj: RedisObject<RedisArray>) => T
  ): T | never {
    const obj = this.objects.find(x => x.key === key);
    return fn(ensureArray(obj, key));
  }

  private withObject<T>(key: string, fn: (obj: RedisObject<RedisHash>) => T) {
    const obj = this.objects.find(x => x.key === key);
    return fn(ensureHash(obj, key));
  }

  private findCursor(cursorId: number) {
    return this.cursors.find(c => c.__id === cursorId) as RedisCursor;
  }

  __data() {
    return this.objects;
  }

  async close() {
    this.state = "CLOSED";
  }

  async decr(key: string) {
    return this.incrby(key, -1);
  }

  async decrby(key: string, n: number) {
    return this.incrby(key, -n);
  }

  async del(key: string) {
    return (this.objects = this.objects.filter(x => x.key !== key)), "OK";
  }

  async discard() {
    this.transaction = undefined;
  }

  async exec() {
    const snapshot = JSON.parse(
      JSON.stringify({
        cursors: this.cursors,
        idCounter: this.idCounter,
        cursorIdCounter: this.cursorIdCounter,
        objects: this.objects
      })
    );
    try {
      return this.transaction
        ? await Promise.all(this.transaction.queue.map(fn => fn(this)))
        : exception(`exec() can be called only from within a transaction.`);
    } catch (ex) {
      this.cursors = snapshot.cursors;
      this.idCounter = snapshot.idCounter;
      this.cursorIdCounter = snapshot.cursorIdCounter;
      this.objects = snapshot.objects;
    }
  }

  async exists(key: string) {
    return (await this.keys()).includes(key);
  }

  async expire(key: string, seconds: number) {
    const obj = this.objects.find(x => x.key === key);
    return typeof obj !== "undefined"
      ? (() => {
          const expiry = Date.now() + seconds * 1000;
          this.replaceObject(obj, { ...obj, expiry });
          return 1;
        })()
      : exception(`The key ${key} was not found.`);
  }

  async get(key: string) {
    const obj = this.objects.find(x => x.key === key);
    return !obj ? undefined : ensurePrimitive(obj, key).value;
  }

  async hget(key: string, field: string) {
    return this.withObject(key, obj => obj.value[field]);
  }

  async hgetall(key: string) {
    return this.withObject(key, obj => obj.value);
  }

  async hincrby(key: string, field: string, n: number) {
    return this.withObject(key, obj => {
      const val = obj.value[field];
      return typeof val === "number"
        ? (() => {
            const newVal = val + n;
            this.replaceObject(obj, {
              ...obj,
              value: { ...obj.value, [field]: newVal }
            });
            return newVal;
          })()
        : exception(
            `The field ${field} of object with key ${key} does not hold a number.`
          );
    });
  }

  async hincrbyfloat(key: string, field: string, n: number) {
    return this.withObject(key, obj => {
      const val = obj.value[field];
      return typeof val === "number"
        ? (() => {
            const newVal = val + n;
            this.replaceObject(obj, {
              ...obj,
              value: { ...obj.value, [field]: newVal }
            });
            return newVal;
          })()
        : exception(
            `The field ${field} of object with key ${key} does not hold a number.`
          );
    });
  }

  async hmget(key: string, fields: string[]) {
    return this.withObject(key, obj =>
      fields.reduce((acc, field) => ({ ...acc, [field]: obj.value[field] }), {})
    );
  }

  async hmset(key: string, newObj: RedisHash) {
    const obj = this.objects.find(x => x.key === key);
    return !obj
      ? (this.addObject({
          key,
          value: newObj
        }),
        "OK")
      : (this.replaceObject(obj, {
          ...obj,
          value: { ...ensureHash(obj, key).value, ...newObj }
        }),
        "OK");
  }

  async hset(key: string, field: string, value: RedisPrimitive) {
    const obj = this.objects.find(x => x.key === key);
    return !obj
      ? (this.addObject({
          key,
          value: { [field]: value }
        }),
        "OK")
      : (this.replaceObject(obj, {
          ...obj,
          value: { ...ensureHash(obj, key).value, [field]: value }
        }),
        "OK");
  }

  async incr(key: string) {
    return this.incrby(key, 1);
  }

  async incrby(key: string, n: number) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? typeof obj.value === "number"
        ? (() => {
            const newVal = obj.value + n;
            this.replaceObject(obj, { ...obj, value: newVal });
            return newVal;
          })()
        : exception(`The key ${key} does not hold a number.`)
      : exception(`The key ${key} was not found.`);
  }

  async incrbyfloat(key: string, n: number) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? typeof obj.value === "number"
        ? (() => {
            const newVal = obj.value + n;
            this.replaceObject(obj, {
              ...obj,
              value: newVal
            });
            return newVal;
          })()
        : exception(`The key ${key} does not hold a number.`)
      : exception(`The key ${key} was not found.`);
  }

  async keys(_pattern?: string) {
    const pattern = _pattern === "*" ? "" : _pattern;
    return this.objects
      .filter(x => new RegExp(pattern || "").test(x.key))
      .map(x => x.key);
  }

  async lindex(key: string, index: number) {
    return this.withArray(key, obj => obj.value.slice(index)[0]);
  }

  async llen(key: string) {
    return this.withArray(key, obj => obj.value.length);
  }

  async lpush(key: string, list: RedisArray) {
    const obj = this.objects.find(x => x.key === key);
    return typeof obj === "undefined"
      ? (this.addObject({
          key,
          value: list
        }),
        list.length)
      : Array.isArray(obj.value)
        ? (() => {
            const newList = list.concat(obj.value);
            this.replaceObject(obj, { ...obj, value: newList });
            return newList.length;
          })()
        : exception(`The value with key ${key} is not an array.`);
  }

  async lrange(key: string, _from?: number, _to?: number) {
    return this.withArray(key, obj => {
      const from = typeof _from !== "undefined" ? _from : 0;
      const to = typeof _to !== "undefined" ? _to : obj.value.length - 1;
      return obj.value.slice(from, to + 1);
    });
  }

  async lrem(key: string, value: RedisPrimitive) {
    return this.withArray(key, obj => {
      this.replaceObject(obj, {
        ...obj,
        value: obj.value.filter(x => x.toString() !== value.toString())
      });
      return "OK";
    });
  }

  async lset(key: string, _index: number, value: RedisPrimitive) {
    return this.withArray(key, obj => {
      const index = _index >= 0 ? _index : obj.value.length + _index;
      return index >= 0
        ? (() => {
            const copy = obj.value.map(x => x);
            copy.splice(_index, 1, value);
            this.replaceObject(obj, { ...obj, value: copy });
            return "OK";
          })()
        : exception(`Invalid index ${_index}.`);
    });
  }

  async ltrim(key: string, _from: number, _to: number) {
    return this.withArray(key, obj => {
      const from = typeof _from !== "undefined" ? _from : 0;
      const to = typeof _to !== "undefined" ? _to : obj.value.length - 1;
      this.replaceObject(obj, { ...obj, value: obj.value.slice(from, to + 1) });
      return "OK";
    });
  }

  async multi() {
    this.transaction = new Multi();
    return this.transaction;
  }

  async open() {
    this.state = "OPEN";
  }

  async rename(from: string, to: string) {
    return this.objects.some(x => x.key === from)
      ? ((this.objects = this.objects.map(
          x => (x.key === from ? { ...x, key: to } : x)
        )),
        "OK")
      : exception(`The key ${from} was not found.`);
  }

  async rpush(key: string, list: RedisArray) {
    const obj = this.objects.find(x => x.key === key);
    return typeof obj === "undefined"
      ? (this.addObject({
          key,
          value: list
        }),
        list.length)
      : Array.isArray(obj.value)
        ? (() => {
            const newList = obj.value.concat(list);
            this.replaceObject(obj, { ...obj, value: newList });
            return newList.length;
          })()
        : exception(`The value with key ${key} is not an array.`);
  }

  async scan(cursorId: number, _pattern: string, _count?: number) {
    const self = this;

    const pattern =
      typeof _pattern === "undefined" || _pattern === "*" ? "" : _pattern;
    const count = typeof _count === "undefined" ? this.objects.length : _count;

    function match(x: RedisObject<RedisValue>) {
      return new RegExp(pattern).test(x.key) ? x.key : [];
    }

    const objects =
      cursorId === 0
        ? this.objects
        : this.objects.filter(x => x.__id > this.findCursor(cursorId).position);

    return objects.length
      ? (function loop([x, ...rest], _acc): [number, RedisValue[]] {
          const acc = _acc.concat(match(x));
          return rest.length === 0
            ? cursorId === 0
              ? [0, acc]
              : (self.removeCursor(cursorId), [0, acc])
            : acc.length === count
              ? (self.addCursor(x.__id), [self.cursorIdCounter, acc])
              : loop(rest, acc);
        })(objects, [] as RedisValue[])
      : [0, []];
  }

  async set(key: string, value: RedisPrimitive, expiry?: number) {
    const obj = this.objects.find(x => x.key === key);
    const newObj = {
      key,
      value,
      expiry: expiry ? Date.now() + expiry * 1000 : -1
    };
    return (
      !obj ? this.addObject(newObj) : this.replaceObject(obj, newObj), "OK"
    );
  }

  async strlen(key: string) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? typeof obj.value === "string" || typeof obj.value === "number"
        ? obj.value.toString().length
        : exception(`The value with key ${key} is not a string or number.`)
      : exception(`The key ${key} was not found.`);
  }
}
