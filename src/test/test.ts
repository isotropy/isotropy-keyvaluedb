require("should");
import redis from "./redis";

describe("Isotropy Redis", () => {
  beforeEach(() => {
    redis.__reset();
  });

  it(`Gets all keys`, async () => {
    const db = await redis.open();
    const result = await db.keys("*");

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
  });

  it(`Gets all keys starting with site`, async () => {
    const db = await redis.open();
    const result = await db.keys("site*");
    db.close();
    result.should.deepEqual(["site1", "site2", "site3", "site4"]);
  });

  it(`Returns whether a key exists`, async () => {
    const db = await redis.open();
    const result = await db.exists("site1");
    db.close();
    result.should.be.true();
  });

  it(`Renames a key`, async () => {
    const db = await redis.open();
    const result = await db.rename("site4", "social1");
    db.close();
    db
      .__data("testdb")
      .find(x => x.key === "social1")
      .value.should.equal("https://www.twitter.com");
  });

  it(`Fails to rename a missing key`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.rename("site69", "social1");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The key site69 was not found.");
  });

  it(`Sets a value`, async () => {
    const db = await redis.open();
    await db.set("site5", "https://www.looptype.com");
    db.close();

    db
      .__data("testdb")
      .find(x => x.key === "site5")
      .value.should.equal("https://www.looptype.com");
  });

  it(`Replaces a value`, async () => {
    const db = await redis.open();
    await db.set("site4", "https://www.looptype.com");
    db.close();

    db
      .__data("testdb")
      .find(x => x.key === "site4")
      .value.should.equal("https://www.looptype.com");
  });

  it(`Executes a transaction`, async () => {
    const db = await redis.open();

    const multi = await db.multi();
    await multi.set("site4", "https://www.looptype.com");
    await multi.incr("total");
    await multi.incr("total");
    const result = await db.exec();

    result.should.deepEqual(['OK', 1001, 1002]);
    
    db
      .__data("testdb")
      .find(x => x.key === "site4")
      .value.should.equal("https://www.looptype.com");
  });

  it(`Rolls back a failed transaction`, async () => {
    const db = await redis.open();

    const multi = await db.multi();
    await multi.set("site4", "https://www.looptype.com");
    await multi.incr("total1");
    const result = await db.exec();

    db
      .__data("testdb")
      .find(x => x.key === "site4")
      .value.should.equal("https://www.twitter.com");
  });

  it(`Gets a value`, async () => {
    const db = await redis.open();
    const result = await db.get("site4");
    db.close();
    result.should.equal("https://www.twitter.com");
  });

  it(`Fails to get a value if it's an array`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.get("countries");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal(
      "The typeof value with key countries is array. Cannot use get."
    );
  });

  it(`Fails to get a value if it's an object`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.get("user:99");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal(
      "The typeof value with key user:99 is object. Cannot use get."
    );
  });

  it(`Increments a value by one`, async () => {
    const db = await redis.open();
    const result = await db.incr("total");
    db.close();

    result.should.equal(1001);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(1001);
  });

  it(`Increments a value by N`, async () => {
    const db = await redis.open();
    const result = await db.incrby("total", 10);
    db.close();

    result.should.equal(1010);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(1010);
  });

  it(`Increments a value by Float N`, async () => {
    const db = await redis.open();
    const result = await db.incrbyfloat("total", 10.45);
    db.close();

    result.should.equal(1010.45);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(1010.45);
  });

  it(`Fails to increment missing item`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.incr("total1");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The key total1 was not found.");
  });

  it(`Fails to increment if item is not a number`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.incr("site1");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The key site1 does not hold a number.");
  });

  it(`Decrements a value by one`, async () => {
    const db = await redis.open();
    const result = await db.decr("total");
    db.close();

    result.should.equal(999);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(999);
  });

  it(`Decrements a value by N`, async () => {
    const db = await redis.open();
    const result = await db.decrby("total", 10);
    db.close();

    result.should.equal(990);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(990);
  });

  it(`Gets the length of a string`, async () => {
    const db = await redis.open();
    const length = await db.strlen("user1");
    db.close();
    length.should.equal(6);
  });

  it(`Fails to get length of a string if item is missing`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const length = await db.strlen("doesnotexist");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The key doesnotexist was not found.");
  });

  it(`Fails to get length of a string if item is not a string or number`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const length = await db.strlen("countries");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal(
      "The value with key countries is not a string or number."
    );
  });

  it(`Removes a value`, async () => {
    const db = await redis.open();
    await db.del("site4");
    db.close();
    db
      .__data("testdb")
      .filter(x => x.key === "site4")
      .should.be.empty();
  });

  it(`Sets a value with expiry`, async () => {
    const db = await redis.open();
    await db.set("site5", "https://www.looptype.com", 10);
    db.close();

    const now = Date.now();
    db
      .__data("testdb")
      .find(x => x.key === "site5")
      .value.should.equal("https://www.looptype.com");
    db
      .__data("testdb")
      .find(x => x.key === "site5")
      .expiry.should.be.lessThan(now + 11000);
  });

  it(`Sets an expiry`, async () => {
    const db = await redis.open();
    await db.expire("site1", 10);
    db.close();

    const now = Date.now();
    db
      .__data("testdb")
      .find(x => x.key === "site1")
      .expiry.should.be.lessThan(now + 11000);
  });

  it(`Creates a list`, async () => {
    const db = await redis.open();
    const result = await db.rpush("fruits", ["apple", "mango", "pear"]);
    db.close();
    result.should.equal(3);
    db
      .__data("testdb")
      .find(x => x.key === "fruits")
      .value.should.deepEqual(["apple", "mango", "pear"]);
  });

  it(`Pushes items to an existing list`, async () => {
    const db = await redis.open();
    const result = await db.rpush("countries", ["bulgaria", "sweden"]);
    db.close();
    result.should.equal(5);
    db
      .__data("testdb")
      .find(x => x.key === "countries")
      .value.should.deepEqual([
        "vietnam",
        "france",
        "belgium",
        "bulgaria",
        "sweden"
      ]);
  });

  it(`Fails to push on non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.rpush("user1", ["bulgaria", "sweden"]);
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Prepend items to a list`, async () => {
    const db = await redis.open();
    await db.lpush("countries", ["bulgaria", "sweden"]);
    db.close();
    db
      .__data("testdb")
      .find(x => x.key === "countries")
      .value.should.deepEqual([
        "bulgaria",
        "sweden",
        "vietnam",
        "france",
        "belgium"
      ]);
  });

  it(`Fails to prepend on non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      await db.lpush("user1", ["bulgaria", "sweden"]);
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Gets an item at index`, async () => {
    const db = await redis.open();
    const result = await db.lindex("countries", 1);
    db.close();
    result.should.deepEqual("france");
  });

  it(`Fails to get an item at index on non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.lindex("user1", 1);
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Sets an item at index`, async () => {
    const db = await redis.open();
    const result = await db.lset("countries", 1, "thailand");
    db.close();
    db
      .__data("testdb")
      .find(x => x.key === "countries")
      .value.should.deepEqual(["vietnam", "thailand", "belgium"]);
  });

  it(`Fails to set an item at index on non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.lset("user1", 1, "thailand");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Gets a list`, async () => {
    const db = await redis.open();
    const result = await db.lrange("countries");
    db.close();
    result.should.deepEqual(["vietnam", "france", "belgium"]);
  });

  it(`Fails to get a non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.lrange("user1");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Gets a list range`, async () => {
    const db = await redis.open();
    const result = await db.lrange("countries", 1, 2);
    db.close();
    result.should.deepEqual(["france", "belgium"]);
  });

  it(`Fails to get a range on non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.lrange("user1", 1, 2);
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Removes from a list`, async () => {
    const db = await redis.open();
    const result = await db.lrem("countries", "belgium");
    db.close();
    db
      .__data("testdb")
      .find(x => x.key === "countries")
      .value.should.deepEqual(["vietnam", "france"]);
  });

  it(`Fails to remove an item on non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.lrem("user1", "belgium");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Trims a list`, async () => {
    const db = await redis.open();
    const result = await db.ltrim("countries", 1, 2);
    db.close();
    db
      .__data("testdb")
      .find(x => x.key === "countries")
      .value.should.deepEqual(["france", "belgium"]);
  });

  it(`Fails to trim on non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.ltrim("user1", 1, 2);
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Gets the length of a list`, async () => {
    const db = await redis.open();
    const result = await db.llen("countries");
    db.close();
    result.should.equal(3);
  });

  it(`Fails to get the length of non-list`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.llen("user1");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Creates a hash`, async () => {
    const db = await redis.open();
    await db.hmset("user:100", {
      username: "jeswin",
      country: "India",
      verified: 1
    });
    db.close();
    db
      .__data("testdb")
      .find(x => x.key === "user:100")
      .value.should.deepEqual({
        username: "jeswin",
        country: "India",
        verified: 1
      });
  });

  it(`Merges into an existing hash`, async () => {
    const db = await redis.open();
    await db.hmset("user:99", { city: "Bombay", blocked: 1 });
    db.close();

    db
      .__data("testdb")
      .find(x => x.key === "user:99")
      .value.should.deepEqual({
        username: "janie",
        country: "India",
        city: "Bombay",
        blocked: 1,
        verified: 1
      });
  });

  it(`Fails to set fields in hash if item is a non-hash`, async () => {
    let ex;

    try {
      const db = await redis.open();
      await db.hmset("user1", {
        username: "jeswin",
        country: "India",
        verified: 1
      });
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an object.");
  });

  it(`Creates a hash with a single field`, async () => {
    const db = await redis.open();
    await db.hset("user:99", "city", "Bombay");
    db.close();

    db
      .__data("testdb")
      .find(x => x.key === "user:99")
      .value.should.deepEqual({
        username: "janie",
        country: "India",
        city: "Bombay",
        verified: 1
      });
  });

  it(`Reads fields of a hash`, async () => {
    const db = await redis.open();
    const result = await db.hmget("user:99", ["username", "verified"]);
    db.close();

    result.should.deepEqual({ username: "janie", verified: 1 });
  });

  it(`Fails to read fields from a non-hash`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.hmget("user1", ["username", "verified"]);
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an object.");
  });

  it(`Reads a single field from a hash`, async () => {
    const db = await redis.open();
    const result = await db.hget("user:99", "username");
    db.close();
    result.should.equal("janie");
  });

  it(`Fails to read single field from a non-hash`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.hget("user1", "username");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an object.");
  });

  it(`Reads all fields of a hash`, async () => {
    const db = await redis.open();
    const result = await db.hgetall("user:99");
    db.close();
    result.should.deepEqual({
      username: "janie",
      country: "India",
      verified: 1
    });
  });

  it(`Fails to read all fields of a non-hash`, async () => {
    let ex;

    try {
      const db = await redis.open();
      const result = await db.hgetall("user1");
      db.close();
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an object.");
  });

  it(`Increments a field in a hash by N`, async () => {
    const db = await redis.open();
    const result = await db.hincrby("user:99", "verified", 2);
    db.close();
    result.should.equal(3);
  });

  it(`Increments a field in a hash by float N`, async () => {
    const db = await redis.open();
    const result = await db.hincrbyfloat("user:99", "verified", 2.5);
    db.close();
    result.should.equal(3.5);
  });

  it(`Scans keys`, async () => {
    const db = await redis.open();
    const result1 = await db.scan(0, "*", 3);
    const result2 = await db.scan(1, "*", 3);
    db.close();
    result1.should.deepEqual([2, ["site1", "site2", "site3"]]);
    result2.should.deepEqual([3, ["site4", "user1", "user2"]]);
  });

  it(`Scans a set of keys with pattern`, async () => {
    const db = await redis.open();
    const result1 = await db.scan(0, "site*");
    db.close();
    result1.should.deepEqual([0, ["site1", "site2", "site3", "site4"]]);
  });

  it(`Scans a set of keys with pattern and count`, async () => {
    const db = await redis.open();
    const result1 = await db.scan(0, "site*", 3);
    const result2 = await db.scan(1, "site*", 3);
    db.close();
    result1.should.deepEqual([2, ["site1", "site2", "site3"]]);
    result2.should.deepEqual([0, ["site4"]]);
  });

  it(`Scans a set of keys with pattern and large count`, async () => {
    const db = await redis.open();
    const result1 = await db.scan(0, "site*", 1000);
    db.close();
    result1.should.deepEqual([0, ["site1", "site2", "site3", "site4"]]);
  });
});
