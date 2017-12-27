import Multi from "./multi";
import exception from "./exception";
import Redis from "./isotropy-redis";

export type RedisPrimitive = string | number;

export type RedisArray = RedisPrimitive[];

export type RedisHash = { [key: string]: RedisPrimitive };

export type RedisValue = RedisPrimitive | RedisHash | RedisArray;

export type RedisObject<T extends RedisValue> = {
  __id?: number;
  key: string;
  value: T;
  expiry?: number;
};

function isPrimitive(val: any): val is RedisPrimitive {
  return typeof val === "string" || typeof val === "number";
}

function ensurePrimitive(val: any): RedisPrimitive | never {
  return isPrimitive(val)
    ? val
    : exception(
        `Expected a primitive but received ${
          typeof val !== "undefined" ? typeof val.value : typeof val
        }.`
      );
}

function isHash(val: any): val is Object {
  return typeof val === "object" && !Array.isArray(val);
}

function ensureHash(val: any): RedisHash | never {
  return isHash(val)
    ? val
    : exception(
        `Expected a hash but received ${
          typeof val !== "undefined" ? typeof val.value : typeof val
        }.`
      );
}

function isArray(val: any): val is RedisArray {
  return Array.isArray(val);
}

function ensureArray(val: any): RedisArray | never {
  return isArray(val)
    ? val
    : exception(
        `Expected an array but received ${
          typeof val !== "undefined" ? typeof val.value : typeof val
        }.`
      );
}

export default class Db {
  redis: Redis;
  objects: RedisObject<any>[];
  state: string;
  transaction?: Multi;
  idCounter: number;
  cursorIdCounter: number;
  cursors: { __id: number; position: number }[];

  constructor(redis: Redis, objects: RedisObject<RedisValue>[]) {
    this.redis = redis;
    this.init(objects);
  }

  private init(objects: RedisObject<RedisValue>[]) {
    this.state = "CLOSED";
    this.cursors = [];
    this.idCounter = 0;
    this.cursorIdCounter = 1;
    this.objects =
      objects && objects.length
        ? objects.map(x => ({ ...x, __id: this.idCounter++ }))
        : [];
    this.transaction = undefined;
  }

  private addCursor(position: number) {
    this.cursors = this.cursors.concat({
      __id: this.cursorIdCounter++,
      position
    });
  }

  private addObject<T extends RedisValue>(obj: RedisObject<T>) {
    this.objects = this.objects.concat({ ...obj, __id: this.idCounter++ });
  }

  private replaceObject<TFrom extends RedisValue, TTo extends RedisValue>(
    obj: RedisObject<TFrom>,
    newObj: RedisObject<TTo>
  ) {
    this.objects = this.objects.map(o => (o === obj ? newObj : o));
  }

  private removeCursor(counter: number) {
    this.cursors = this.cursors.filter(x => x.__id === counter);
  }

  private isArray(obj: any): obj is Array<RedisPrimitive> {
    return Array.isArray(obj);
  }

  private withArray<T>(
    key: string,
    fn: (obj: RedisObject<RedisArray>) => T
  ): T | never {
    const obj = this.objects.find(x => x.key === key);
    return typeof obj !== "undefined" && Array.isArray(obj.value)
      ? fn(obj)
      : exception(`The value with key ${key} is not an array.`);
  }

  private withObject<T>(key: string, fn: (obj: RedisObject<RedisHash>) => T) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? isHash(obj.value)
        ? fn(obj)
        : exception(`The value with key ${key} is not an object.`)
      : fn({ key, value: {} });
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
      return await Promise.all(this.transaction.queue.map(fn => fn(this)));
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
    return obj && ensurePrimitive(obj.value);
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
            const newVal = parseInt(val) + n;
            this.replaceObject(obj, {
              ...obj,
              value: { ...obj.value, [field]: newVal }
            });
            return newVal;
            s;
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
            const newVal = parseFloat(val) + n;
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

  async hmset(key: string, newObj: object) {
    const obj = this.objects.find(x => x.key === key);
    return !obj
      ? (this.addObject({
          key,
          value: newObj
        }),
        "OK")
      : isHash(obj.value)
        ? (this.replaceObject(obj, {
            ...obj,
            value: { ...obj.value, ...newObj }
          }),
          true)
        : exception(`The value with key ${key} is not an object.`);
  }

  async hset(key: string, field: string, value: RedisPrimitive) {
    const obj = this.objects.find(x => x.key === key);
    return !obj
      ? (this.addObject({
          key,
          value: { [field]: value }
        }),
        "OK")
      : isHash(obj.value)
        ? (this.replaceObject(obj, {
            ...obj,
            value: { ...obj.value, [field]: value }
          }),
          "OK")
        : exception(`The value with key ${key} is not an object.`);
  }

  async incr(key: string) {
    return this.incrby(key, 1);
  }

  async incrby(key: string, n: number) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? !isNaN(obj.value)
        ? (() => {
            const newVal = parseInt(obj.value) + n;
            this.replaceObject(obj, { ...obj, value: newVal });
            return newVal;
          })()
        : exception(`The key ${key} does not hold a number.`)
      : exception(`The key ${key} was not found.`);
  }

  async incrbyfloat(key: string, n: number) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? !isNaN(obj.value)
        ? (() => {
            const newVal = parseFloat(obj.value) + n;
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

  async lrange(key: string, _from: number, _to: number) {
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
            const copy = [].concat(obj.value);
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

  async scan(cursorId: number, _pattern: string, _count: number) {
    const self = this;

    const pattern =
      typeof _pattern === "undefined" || _pattern === "*" ? "" : _pattern;
    const count = typeof _count === "undefined" ? this.objects.length : _count;

    function match(x) {
      return new RegExp(pattern).test(x.key) ? x.key : [];
    }

    const objects =
      cursorId === 0
        ? this.objects
        : this.objects.filter(
            x => x.__id > this.cursors.find(c => c.__id === cursorId).position
          );

    return objects.length
      ? (function loop([x, ...rest], _acc) {
          const acc = _acc.concat(match(x));
          return rest.length === 0
            ? cursorId === 0
              ? [0, acc]
              : (self.removeCursor(cursorId), [0, acc])
            : acc.length === count
              ? (self.addCursor(x.__id), [self.cursorIdCounter, acc])
              : loop(rest, acc);
        })(objects, [])
      : [0, []];
  }

  async set(key: string, value: RedisPrimitive, expiry: number) {
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
