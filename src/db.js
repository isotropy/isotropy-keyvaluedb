import exception from "./exception";
import { log } from "util";

function isPrimitive(val) {
  return typeof val === "string" || typeof val === "number";
}

export default class Db {
  constructor(objects) {
    this.objects = objects || [];
  }

  withArray(key, fn) {
    const obj = this.objects.find(x => x.key === key);
    return typeof obj !== "undefined" && Array.isArray(obj.value)
      ? fn(obj)
      : exception(`The value with key ${key} is not an array.`);
  }

  async decr(key) {
    return this.incrBy(key, -1);
  }

  async decrBy(key, n) {
    return this.incrBy(key, -n);
  }

  async del(key) {
    return (this.objects = this.objects.filter(x => x.key !== key)), true;
  }

  async exists(key) {
    return (await this.keys()).includes(key);
  }

  async expire(key, seconds) {
    const obj = this.objects.find(x => x.key === key);
    return obj ? ((obj.expiry = Date.now() + seconds * 1000), true) : false;
  }

  async get(key) {
    const obj = this.objects.find(x => x.key === key);
    return obj && isPrimitive(obj.value)
      ? obj.value
      : exception(
          `The typeof value with key ${key} is ${Array.isArray(obj.value)
            ? "array"
            : typeof obj.value}. Cannot use get.`
        );
  }

  async incr(key) {
    return this.incrBy(key, 1);
  }

  async incrBy(key, n) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? !isNaN(obj.value)
        ? ((obj.value = parseInt(obj.value) + n), obj.value)
        : exception(`The key ${key} does not hold a number.`)
      : exception(`The key ${key} was not found.`);
  }

  async incrByFloat(key, n) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? !isNaN(obj.value)
        ? ((obj.value = parseFloat(obj.value) + n), obj.value)
        : exception(`The key ${key} does not hold a number.`)
      : exception(`The key ${key} was not found.`);
  }

  async keys() {
    return this.objects.map(x => x.key);
  }

  async keysStartingWith(str) {
    return (await this.keys()).filter(x => x.startsWith(str));
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
      ? ((this.objects = this.objects.concat({
          key,
          value: list
        })),
        list.length)
      : Array.isArray(obj.value)
        ? ((obj.value = list.concat(obj.value)), obj.value.length)
        : exception(`Cannot push to non-array having key ${key}.`);
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
      obj.value = obj.value.filter(x => x.toString() !== value.toString());
      return true;
    });
  }

  async lset(key, _index, value) {
    return this.withArray(key, obj => {
      const index = _index >= 0 ? _index : obj.value.length + _index;
      return index >= 0
        ? (() => {
            const copy = [].concat(obj.value);
            copy.splice(_index, 1, value);
            obj.value = copy;
            return true;
          })()
        : exception(`Invalid index ${_index}.`);
    });
  }

  async ltrim(key, _from, _to) {
    return this.withArray(key, obj => {
      const from = typeof _from !== "undefined" ? _from : 0;
      const to = typeof _to !== "undefined" ? _to : obj.value.length - 1;
      obj.value = obj.value.slice(from, to + 1);
      return true;
    });
  }

  async rename(from, to) {
    return this.objects.some(x => x.key === from)
      ? ((this.objects = this.objects.map(
          x => (x.key === from ? { ...x, key: to } : x)
        )),
        true)
      : exception(`The key ${from} was not found.`);
  }

  async rpush(key, list) {
    const obj = this.objects.find(x => x.key === key);
    return typeof obj === "undefined"
      ? ((this.objects = this.objects.concat({
          key,
          value: list
        })),
        list.length)
      : Array.isArray(obj.value)
        ? ((obj.value = obj.value.concat(list)), obj.value.length)
        : exception(`Cannot push to non-array having key ${key}.`);
  }

  async set(key, value, expiry) {
    this.objects = this.objects.concat({
      key,
      value,
      expiry: Date.now() + expiry * 1000
    });
  }

  async strlen(key) {
    const obj = this.objects.find(x => x.key === key);
    return obj
      ? typeof obj.value === "string" || typeof obj.value === "number"
        ? obj.value.toString().length
        : exception(`The key ${key} does not hold a string or number.`)
      : exception(`The key ${key} was not found.`);
  }
}
