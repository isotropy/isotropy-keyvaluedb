# Isotropy client-side Library for Redis

### Initialization

```javascript
const objects = [
  {
    key: "site1",
    value: "https://www.google.com"
  },
  {
    key: "site2",
    value: "https://www.apple.com",
    expiry: 1530800000000
  },
  {
    key: "site3",
    value: "https://www.amazon.com"
  },
  {
    key: "site4",
    value: "https://www.twitter.com"
  },
  {
    key: "user1",
    value: "jeswin"
  },
  {
    key: "user2",
    value: "deeps"
  },
  {
    key: "user3",
    value: "tommi"
  },
  {
    key: "countries",
    value: ["vietnam", "france", "belgium"]
  },
  {
    key: "total",
    value: 1000
  },
  {
    key: "user:99",
    value: {
      username: "janie",
      country: "India",
      verified: 1
    }
  }
];

db.init("testdb", objects);
```

### API

Gets all keys

```javascript
const conn = await db.open("testdb");
const result = await conn.keys("*");

result.should.deepEqual([
  "site1",
  "site2",
  "site3",
  "site4",
  "user1",
  "user2",
  "user3",
  "countries",
  "total",
  "user:99"
]);
```

Gets all keys starting with site

```javascript
it(``, async () => {
  const conn = await db.open("testdb");
  const result = await conn.keys("site*");
  result.should.deepEqual(["site1", "site2", "site3", "site4"]);
});
```

Gets whether a key exists

```javascript
const conn = await db.open("testdb");
const result = await conn.exists("site1");
result.should.be.true();
```

Renames a key

```javascript
const conn = await db.open("testdb");
const result = await conn.rename("site4", "social1");
```

Sets a value

```javascript
const conn = await db.open("testdb");
await conn.set("site5", "https://www.looptype.com");
```

Replaces a value

```javascript
const conn = await db.open("testdb");
await conn.set("site4", "https://www.looptype.com");
```

Executes a transaction

```javascript
const conn = await db.open("testdb");

const multi = await conn.multi();
await multi.set("site4", "https://www.looptype.com");
await multi.incr("total");
await multi.incr("total");
const result = await conn.exec();

result.should.deepEqual(["OK", 1001, 1002]);
```

Gets a value

```javascript
const conn = await db.open("testdb");
const result = await conn.get("site4");
```

Increments a value by one

```javascript
const conn = await db.open("testdb");
const result = await conn.incr("total");
result.should.equal(1001);
```

Increments a value by N

```javascript
const conn = await db.open("testdb");
const result = await conn.incrby("total", 10);
result.should.equal(1010);
```

Increments a value by Float N

```javascript
const conn = await db.open("testdb");
const result = await conn.incrbyfloat("total", 10.45);
result.should.equal(1010.45);
```

Decrements a value by one

```javascript
const conn = await db.open("testdb");
const result = await conn.decr("total");
result.should.equal(999);
```

Decrements a value by N

```javascript
const conn = await db.open("testdb");
const result = await conn.decrby("total", 10);
result.should.equal(990);
```

Gets the length of a string

```javascript
const conn = await db.open("testdb");
const length = await conn.strlen("user1");
length.should.equal(6);
```

Removes a value

```javascript
const conn = await db.open("testdb");
await conn.del("site4");
```

Sets a value with expiry

```javascript
const conn = await db.open("testdb");
await conn.set("site5", "https://www.looptype.com", 10);
```

Sets an expiry

```javascript
const conn = await db.open("testdb");
await conn.expire("site1", 10);
```

Creates a list

```javascript
const conn = await db.open("testdb");
const result = await conn.rpush("fruits", ["apple", "mango", "pear"]);
result.should.equal(3);
```

Pushes items to an existing list

```javascript
const conn = await db.open("testdb");
const result = await conn.rpush("countries", ["bulgaria", "sweden"]);
result.should.equal(5);
```

Prepends items to a list

```javascript
const conn = await db.open("testdb");
await conn.lpush("countries", ["bulgaria", "sweden"]);
```

Gets an item at index

```javascript
const conn = await db.open("testdb");
const result = await conn.lindex("countries", 1);
result.should.deepEqual("france");
```

Sets an item at index

```javascript
const conn = await db.open("testdb");
const result = await conn.lset("countries", 1, "thailand");
```

Gets a list

```javascript
const conn = await db.open("testdb");
const result = await conn.lrange("countries");
result.should.deepEqual(["vietnam", "france", "belgium"]);
```

Gets a list range

```javascript
const conn = await db.open("testdb");
const result = await conn.lrange("countries", 1, 2);
result.should.deepEqual(["france", "belgium"]);
```

Removes from a list

```javascript
const conn = await db.open("testdb");
const result = await conn.lrem("countries", "belgium");
```

Trims a list

```javascript
const conn = await db.open("testdb");
const result = await conn.ltrim("countries", 1, 2);
```

Gets the length of a list

```javascript
const conn = await db.open("testdb");
const result = await conn.llen("countries");
result.should.equal(3);
```

Creates a hash

```javascript
const conn = await db.open("testdb");
await conn.hmset("user:100", {
  username: "jeswin",
  country: "India",
  verified: 1
});
```

Merges into an existing hash

```javascript
const conn = await db.open("testdb");
await conn.hmset("user:99", { city: "Bombay", blocked: 1 });
```

Creates a hash with a single field

```javascript
const conn = await db.open("testdb");
await conn.hset("user:99", "city", "Bombay");
```

Reads fields of a hash

```javascript
const conn = await db.open("testdb");
const result = await conn.hmget("user:99", ["username", "verified"]);
result.should.deepEqual({ username: "janie", verified: 1 });
```

Reads a single field from a hash

```javascript
const conn = await db.open("testdb");
const result = await conn.hget("user:99", "username");
result.should.equal("janie");
```

Reads all fields of a hash

```javascript
const conn = await db.open("testdb");
const result = await conn.hgetall("user:99");
result.should.deepEqual({
  username: "janie",
  country: "India",
  verified: 1
});
```

Increments a field in a hash by N

```javascript
const conn = await db.open("testdb");
const result = await conn.hincrby("user:99", "verified", 2);
result.should.equal(3);
```

Increments a field in a hash by float N

```javascript
const conn = await db.open("testdb");
const result = await conn.hincrbyfloat("user:99", "verified", 2.5);
result.should.equal(3.5);
```

Scans keys

```javascript
const conn = await db.open("testdb");
const result1 = await conn.scan(0, "*", 3);
const result2 = await conn.scan(1, "*", 3);
result1.should.deepEqual([2, ["site1", "site2", "site3"]]);
result2.should.deepEqual([3, ["site4", "user1", "user2"]]);
```

Scans a set of keys with pattern

```javascript
const conn = await db.open("testdb");
const result1 = await conn.scan(0, "site*");
result1.should.deepEqual([0, ["site1", "site2", "site3", "site4"]]);
```

Scans a set of keys with pattern and count

```javascript
const conn = await db.open("testdb");
const result1 = await conn.scan(0, "site*", 3);
const result2 = await conn.scan(1, "site*", 3);
result1.should.deepEqual([2, ["site1", "site2", "site3"]]);
result2.should.deepEqual([0, ["site4"]]);
```

Scans a set of keys with pattern and large count

```javascript
const conn = await db.open("testdb");
const result1 = await conn.scan(0, "site*", 1000);
result1.should.deepEqual([0, ["site1", "site2", "site3", "site4"]]);
```
