import exception from "./exception";

export default class Db {
  constructor(objects) {
    this.objects = objects || [];
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
    return obj
      ? !Array.isArray(obj.value)
        ? typeof obj.value !== "object"
          ? obj.value
          : exception(
              `The key ${key} holds an object. Use hmget or hget instead of get.`
            )
        : exception(`The key ${key} holds an array. Use lrange instead of get.`)
      : exception(`The key ${from} was not found.`);
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
