import should from "should";
import * as babel from "babel-core";
import sourceMapSupport from "source-map-support";
import { log } from "util";
import * as db from "../isotropy-redis";

sourceMapSupport.install();

function table(name) {}

describe("Isotropy Redis", () => {
  beforeEach(() => {
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
        value: "jeswin",
        tags: ["admin"]
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
  });

  it(`Returns all keys`, async () => {
    const result = await db.open("testdb").keys("*");

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

  it(`Returns all keys starting with site`, async () => {
    const result = await db.open("testdb").keys("site*");

    result.should.deepEqual(["site1", "site2", "site3", "site4"]);
  });

  it(`Returns whether a key exists`, async () => {
    const result = await db.open("testdb").exists("site1");
    result.should.be.true();
  });

  it(`Rename a key`, async () => {
    const result = await db.open("testdb").rename("site4", "social1");
    db
      .__data("testdb")
      .find(x => x.key === "social1")
      .value.should.equal("https://www.twitter.com");
  });

  it(`Fails to rename a missing key`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").rename("site69", "social1");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The key site69 was not found.");
  });

  it(`Sets a value`, async () => {
    await db.open("testdb").set("site5", "https://www.looptype.com");

    db
      .__data("testdb")
      .find(x => x.key === "site5")
      .value.should.equal("https://www.looptype.com");
  });

  it(`Gets a value`, async () => {
    const result = await db.open("testdb").get("site4");
    result.should.equal("https://www.twitter.com");
  });

  it(`Fails to get a value if it's an array`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").get("countries");
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
      const result = await db.open("testdb").get("user:99");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal(
      "The typeof value with key user:99 is object. Cannot use get."
    );
  });

  it(`Increment a value by one`, async () => {
    const result = await db.open("testdb").incr("total");

    result.should.equal(1001);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(1001);
  });

  it(`Increment a value by N`, async () => {
    const result = await db.open("testdb").incrby("total", 10);

    result.should.equal(1010);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(1010);
  });

  it(`Increment a value by Float N`, async () => {
    const result = await db.open("testdb").incrbyfloat("total", 10.45);

    result.should.equal(1010.45);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(1010.45);
  });

  it(`Fails to increment missing item`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").incr("total1");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The key total1 was not found.");
  });

  it(`Fails to increment if item is not a number`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").incr("site1");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The key site1 does not hold a number.");
  });

  it(`Decrement a value by one`, async () => {
    const result = await db.open("testdb").decr("total");

    result.should.equal(999);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(999);
  });

  it(`Decrement a value by N`, async () => {
    const result = await db.open("testdb").decrby("total", 10);

    result.should.equal(990);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(990);
  });

  it(`Gets the length of a string`, async () => {
    const length = await db.open("testdb").strlen("user1");
    length.should.equal(6);
  });

  it(`Fails to get length of a string if item is missing`, async () => {
    let ex;

    try {
      const length = await db.open("testdb").strlen("doesnotexist");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The key doesnotexist was not found.");
  });

  it(`Fails to get length of a string if item is not a string or number`, async () => {
    let ex;

    try {
      const length = await db.open("testdb").strlen("countries");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal(
      "The value with key countries is not a string or number."
    );
  });

  it(`Remove a value`, async () => {
    await db.open("testdb").del("site4");
    db
      .__data("testdb")
      .filter(x => x.key === "site4")
      .should.be.empty();
  });

  it(`Sets a value with expiry`, async () => {
    await db.open("testdb").set("site5", "https://www.looptype.com", 10);

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
    await db.open("testdb").expire("site1", 10);

    const now = Date.now();
    db
      .__data("testdb")
      .find(x => x.key === "site1")
      .expiry.should.be.lessThan(now + 11000);
  });

  it(`Creates a list`, async () => {
    const result = await db
      .open("testdb")
      .rpush("fruits", ["apple", "mango", "pear"]);
    result.should.equal(3);
    db
      .__data("testdb")
      .find(x => x.key === "fruits")
      .value.should.deepEqual(["apple", "mango", "pear"]);
  });

  it(`Pushes items to an existing list`, async () => {
    const result = await db
      .open("testdb")
      .rpush("countries", ["bulgaria", "sweden"]);
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
      const result = await db
        .open("testdb")
        .rpush("user1", ["bulgaria", "sweden"]);
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Prepend items to a list`, async () => {
    await db.open("testdb").lpush("countries", ["bulgaria", "sweden"]);
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
      await db.open("testdb").lpush("user1", ["bulgaria", "sweden"]);
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Gets an item at index`, async () => {
    const result = await db.open("testdb").lindex("countries", 1);
    result.should.deepEqual("france");
  });

  it(`Fails to get an item at index on non-list`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").lindex("user1", 1);
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Sets an item at index`, async () => {
    const result = await db.open("testdb").lset("countries", 1, "thailand");
    db
      .__data("testdb")
      .find(x => x.key === "countries")
      .value.should.deepEqual(["vietnam", "thailand", "belgium"]);
  });

  it(`Fails to set an item at index on non-list`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").lset("user1", 1, "thailand");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Gets a list`, async () => {
    const result = await db.open("testdb").lrange("countries");
    result.should.deepEqual(["vietnam", "france", "belgium"]);
  });

  it(`Fails to get a non-list`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").lrange("user1");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Gets a list range`, async () => {
    const result = await db.open("testdb").lrange("countries", 1, 2);
    result.should.deepEqual(["france", "belgium"]);
  });

  it(`Fails to get a range on non-list`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").lrange("user1", 1, 2);
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Removes from a list`, async () => {
    const result = await db.open("testdb").lrem("countries", "belgium");
    db
      .__data("testdb")
      .find(x => x.key === "countries")
      .value.should.deepEqual(["vietnam", "france"]);
  });

  it(`Fails to remove an item on non-list`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").lrem("user1", "belgium");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Trims a list`, async () => {
    const result = await db.open("testdb").ltrim("countries", 1, 2);
    db
      .__data("testdb")
      .find(x => x.key === "countries")
      .value.should.deepEqual(["france", "belgium"]);
  });

  it(`Fails to trim on non-list`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").ltrim("user1", 1, 2);
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Gets the length of a list`, async () => {
    const result = await db.open("testdb").llen("countries");
    result.should.equal(3);
  });

  it(`Fails to get the length of non-list`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").llen("user1");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an array.");
  });

  it(`Creates a hash`, async () => {
    await db
      .open("testdb")
      .hmset("user:100", { username: "jeswin", country: "India", verified: 1 });
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
    await db.open("testdb").hmset("user:99", { city: "Bombay", blocked: 1 });

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
      await db
        .open("testdb")
        .hmset("user1", { username: "jeswin", country: "India", verified: 1 });
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an object.");
  });

  it(`Creates a hash with a single field`, async () => {
    await db.open("testdb").hset("user:99", "city", "Bombay");

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
    const result = await db
      .open("testdb")
      .hmget("user:99", ["username", "verified"]);

    result.should.deepEqual({ username: "janie", verified: 1 });
  });

  it(`Fails to read fields from a non-hash`, async () => {
    let ex;

    try {
      const result = await db
        .open("testdb")
        .hmget("user1", ["username", "verified"]);
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an object.");
  });

  it(`Reads a single field from a hash`, async () => {
    const result = await db.open("testdb").hget("user:99", "username");
    result.should.equal("janie");
  });

  it(`Fails to read single field from a non-hash`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").hget("user1", "username");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an object.");
  });

  it(`Reads all fields of a hash`, async () => {
    const result = await db.open("testdb").hgetall("user:99");
    result.should.deepEqual({
      username: "janie",
      country: "India",
      verified: 1
    });
  });

  it(`Fails to read all fields of a non-hash`, async () => {
    let ex;

    try {
      const result = await db.open("testdb").hgetall("user1");
    } catch (_ex) {
      ex = _ex;
    }

    ex.message.should.equal("The value with key user1 is not an object.");
  });

  it(`Increments a field in a hash by N`, async () => {
    const result = await db.open("testdb").hincrby("user:99", "verified", 2);
    result.should.equal(3);
  });

  it(`Increments a field in a hash by float N`, async () => {
    const result = await db
      .open("testdb")
      .hincrbyfloat("user:99", "verified", 2.5);
    result.should.equal(3.5);
  });

  it(`Scans keys`, async () => {
    const result1 = await db.open("testdb").scan(0, "*", 3);
    result1.should.deepEqual([2, ["site1", "site2", "site3"]]);
    const result2 = await db.open("testdb").scan(1, "*", 3);
    result2.should.deepEqual([3, ["site4", "user1", "user2"]]);
  });


  it(`Scans a set of keys with pattern`, async () => {
    const result1 = await db.open("testdb").scan(0, "site*");
    result1.should.deepEqual([0, ["site1", "site2", "site3", "site4"]]);
  });

  it(`Scans a set of keys with pattern and count`, async () => {
    const result1 = await db.open("testdb").scan(0, "site*", 3);
    result1.should.deepEqual([2, ["site1", "site2", "site3"]]);
    const result2 = await db.open("testdb").scan(1, "site*", 3);
    result2.should.deepEqual([0, ["site4"]]);
  });

  it(`Scans a set of keys with pattern and large count`, async () => {
    const result1 = await db.open("testdb").scan(0, "site*", 1000);
    result1.should.deepEqual([0, ["site1", "site2", "site3", "site4"]]);
  });
});
