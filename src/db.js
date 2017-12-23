import Multi from "./multi";
import exception from "./exception";

function isPrimitive(val) {
  return typeof val === "string" || typeof val === "number";
}

function isObject(val) {
  return typeof val === "object" && !Array.isArray(val);
}

export default class Db {
  constructor(redis, objects) {
    this.redis = redis;
    this.init(objects);
  }

  init(objects) {
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

  addCursor(position) {
    this.cursors = this.cursors.concat({
      __id: this.cursorIdCounter++,
      position
    });
  }

  addObject(obj) {
    this.objects = this.objects.concat({ ...obj, __id: this.idCounter++ });
  }

  replaceObject(obj, newObj) {
    this.objects = this.objects.map(o => (o === obj ? newObj : o));
  }

  removeCursor(counter) {
    this.cursors = this.cursors.filter(x => x.counter === counter);
  }

  withArray(key, fn) {
    const obj = this.objects.find(x => x.key === key);
    return typeof obj !== "undefined" && Array.isArray(obj.value)
      ? fn(obj)
      : exception(`The value with key ${key} is not an array.`);
  }

  withObject(key, fn) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? isObject(obj.value)
        ? fn(obj)
        : exception(`The value with key ${key} is not an object.`)
      : fn({ key, value: {} });
  }

  close() {
    this.state = "CLOSED";
  }

  __data() {
    return this.objects;
  }

  open() {
    this.state = "OPEN";
  }

  async decr(key) {
    return this.incrby(key, -1);
  }

  async decrby(key, n) {
    return this.incrby(key, -n);
  }

  async del(key) {
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

  async exists(key) {
    return (await this.keys()).includes(key);
  }

  async expire(key, seconds) {
    const obj = this.objects.find(x => x.key === key);
    return typeof obj !== "undefined"
      ? (() => {
          const expiry = Date.now() + seconds * 1000;
          this.replaceObject(obj, { ...obj, expiry });
          return 1;
        })()
      : exception(`The key ${key} was not found.`);
  }

  async get(key) {
    const obj = this.objects.find(x => x.key === key);
    return obj && isPrimitive(obj.value)
      ? obj.value
      : exception(
          `The typeof value with key ${key} is ${
            Array.isArray(obj.value) ? "array" : typeof obj.value
          }. Cannot use get.`
        );
  }

  async hget(key, field) {
    return this.withObject(key, obj => obj.value[field]);
  }

  async hgetall(key) {
    return this.withObject(key, obj => obj.value);
  }

  async hincrby(key, field, n) {
    return this.withObject(key, obj => {
      const val = obj.value[field];
      return !isNaN(val)
        ? (() => {
            const newVal = parseInt(val) + n;
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

  async hincrbyfloat(key, field, n) {
    return this.withObject(key, obj => {
      const val = obj.value[field];
      return !isNaN(val)
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

  async hmget(key, fields) {
    return this.withObject(key, obj =>
      fields.reduce((acc, field) => ({ ...acc, [field]: obj.value[field] }), {})
    );
  }

  async hmset(key, newObj) {
    const obj = this.objects.find(x => x.key === key);
    return !obj
      ? (this.addObject({
          key,
          value: newObj
        }),
        "OK")
      : isObject(obj.value)
        ? (this.replaceObject(obj, {
            ...obj,
            value: { ...obj.value, ...newObj }
          }),
          true)
        : exception(`The value with key ${key} is not an object.`);
  }

  async hset(key, field, value) {
    const obj = this.objects.find(x => x.key === key);
    return !obj
      ? (this.addObject({
          key,
          value: { [field]: value }
        }),
        "OK")
      : isObject(obj.value)
        ? (this.replaceObject(obj, {
            ...obj,
            value: { ...obj.value, [field]: value }
          }),
          "OK")
        : exception(`The value with key ${key} is not an object.`);
  }

  async incr(key) {
    return this.incrby(key, 1);
  }

  async incrby(key, n) {
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

  async incrbyfloat(key, n) {
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

  async keys(_pattern) {
    const pattern = _pattern === "*" ? "" : _pattern;
    return this.objects
      .filter(x => new RegExp(pattern).test(x.key))
      .map(x => x.key);
  }

  async lindex(key, index) {
    return this.withArray(key, obj => obj.value.slice(index)[0]);
  }

  async llen(key) {
    return this.withArray(key, obj => obj.value.length);
  }

  async lpush(key, list) {
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

  async lrange(key, _from, _to) {
    return this.withArray(key, obj => {
      const from = typeof _from !== "undefined" ? _from : 0;
      const to = typeof _to !== "undefined" ? _to : obj.value.length - 1;
      return obj.value.slice(from, to + 1);
    });
  }

  async lrem(key, value) {
    return this.withArray(key, obj => {
      this.replaceObject(obj, {
        ...obj,
        value: obj.value.filter(x => x.toString() !== value.toString())
      });
      return "OK";
    });
  }

  async lset(key, _index, value) {
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

  async ltrim(key, _from, _to) {
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

  async rename(from, to) {
    return this.objects.some(x => x.key === from)
      ? ((this.objects = this.objects.map(
          x => (x.key === from ? { ...x, key: to } : x)
        )),
        "OK")
      : exception(`The key ${from} was not found.`);
  }

  async rpush(key, list) {
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

  async scan(cursorId, _pattern, _count) {
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

  async set(key, value, expiry) {
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

  async strlen(key) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? typeof obj.value === "string" || typeof obj.value === "number"
        ? obj.value.toString().length
        : exception(`The value with key ${key} is not a string or number.`)
      : exception(`The key ${key} was not found.`);
  }
}
