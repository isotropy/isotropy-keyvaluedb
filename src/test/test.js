import should from "should";
import * as babel from "babel-core";
import sourceMapSupport from "source-map-support";
import { log } from "util";
import * as db from "../isotropy-redis";

sourceMapSupport.install();

function table(name) {}

describe("Isotropy FS", () => {
  beforeEach(() => {
    const objects = [
      {
        key: "site1",
        value: "https://www.google.com",
        tags: ["search", "software"]
      },
      {
        key: "site2",
        value: "https://www.apple.com",
        expiry: 1530800000000,
        tags: ["phones", "hardware"]
      },
      {
        key: "site3",
        value: "https://www.amazon.com",
        tags: ["software", "ecommerce"]
      },
      {
        key: "site4",
        value: "https://www.twitter.com",
        tags: ["software", "social"]
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
        key: "user99",
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
    const results = db.open("testdb").keys();

    results.length.should.equal([
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

  it(`Returns keys starting with`, async () => {
    const results = db.open("testdb").keysStartingWith("site");
    results.length.should.equal(["site1", "site2", "site3", "site4"]);
  });

  it(`Returns whether a key exists`, async () => {
    const results = db.open("testdb").hasKey("site1");
    results.length.should.be.true();
  });

  it(`Sets a value`, async () => {
    await db.open("testdb").set("site5", "www.looptype.com");

    db
      .__data()
      .find(x => x.key === "site5")
      .value.should.equal("https://www.looptype.com");
  });

  it(`Gets a value`, async () => {
    const result = await db.open("testdb").get("site4");
    result.should.equal("https://www.twitter.com");
  });

  it(`Increment a value`, async () => {
    await db.open("testdb").incr("total");

    db
      .__data()
      .find(x => x.key === "total")
      .value.should.equal(1001);
  });

  it(`Increment a value by N`, async () => {
    await db.open("testdb").incrby("total", 10);

    db
      .__data()
      .find(x => x.key === "total")
      .value.should.equal(1010);
  });

  it(`Decrement a value`, async () => {
    await db.open("testdb").decr("total");

    db
      .__data()
      .find(x => x.key === "total")
      .value.should.equal(999);
  });

  it(`Decrement a value by N`, async () => {
    await db.open("testdb").decrby("total", 10);

    db
      .__data()
      .find(x => x.key === "total")
      .value.should.equal(990);
  });

  it(`Increment a value by float N`, async () => {
    await db.open("testdb").incrbyfloat("total", 10.1);

    db
      .__data()
      .find(x => x.key === "total")
      .value.should.equal(1010.1);
  });

  it(`Gets the length of a string`, async () => {
    const length = await db.open("testdb").strlen("strlen", "user1");
    length.should.equal(6);
  });

  it(`Remove a value`, async () => {
    await db.open("testdb").remove("site4");
    db
      .__data()
      .filter(x => x.key === "site4")
      .should.be.empty();
  });

  it(`Sets a value with expiry`, async () => {
    await db.open("testdb").set("site5", "www.looptype.com", 1530800000000);

    db
      .__data()
      .find(x => x.key === "site5")
      .value.should.equal("https://www.looptype.com");
    db
      .__data()
      .find(x => x.key === "site5")
      .expiry.should.equal(1530800000000);
  });

  it(`Creates a list`, async () => {
    await db.open("testdb").rpush("fruits", ["apple", "mango", "pear"]);
    db
      .__data()
      .find(x => x.key === "fruits")
      .value.should.deepEqual(["apple", "mango", "pear"]);
  });

  it(`Pushes items to an existing list`, async () => {
    await db.open("testdb").rpush("countries", ["bulgaria", "sweden"]);
    db
      .__data()
      .find(x => x.key === "countries")
      .value.should.deepEqual([
        "vietnam",
        "france",
        "belgium",
        "bulgaria",
        "sweden"
      ]);
  });

  it(`Prepend items to a list`, async () => {
    await db.open("testdb").lpush("countries", ["bulgaria", "sweden"]);
    db
      .__data()
      .find(x => x.key === "countries")
      .value.should.deepEqual([
        "bulgaria",
        "sweden",
        "vietnam",
        "france",
        "belgium"
      ]);
  });

  it(`Gets an item at index`, async () => {
    const result = await db.open("testdb").lindex("countries", 1);
    result.should.deepEqual("france");
  });

  it(`Sets an item at index`, async () => {
    const result = await db.open("testdb").lset("countries", 1, "thailand");
    db
      .__data()
      .find(x => x.key === "countries")
      .value.should.deepEqual(["vietnam", "thailand", "belgium"]);
  });

  it(`Gets a list`, async () => {
    const result = await db.open("testdb").lrange("countries");
    result.should.deepEqual(["vietnam", "france", "belgium"]);
  });

  it(`Gets a list range`, async () => {
    const result = await db.open("testdb").lrange("countries", 1, 2);
    result.should.deepEqual(["france", "belgium"]);
  });

  it(`Removes from a list`, async () => {
    await await db.open("testdb").lrem("countries", "belgium");
    result.should.deepEqual(["vietnam", "france"]);
  });

  it(`Trims a list`, async () => {
    await await db.open("testdb").ltrim("countries", 1, 2);
    db
      .__data()
      .find(x => x.key === "countries")
      .value.should.deepEqual(["france", "belgium"]);
  });

  it(`Gets the length of a list`, async () => {
    const result = await db.open("testdb").llen("countries");
    result.length.should.equal(3);
  });

  it(`Creates a hash`, async () => {
    await db
      .open("testdb")
      .hmset("user:100", { username: "jeswin", country: "India", verified: 1 });
    db
      .__data()
      .find(x => x.key === "user:100")
      .value.should.deepEqual({
        username: "jeswin",
        country: "India",
        verified: 1
      });
  });

  it(`Creates a hash with a single field`, async () => {
    await db.open("testdb").hset("user:101", { username: "chad" });
    db
      .__data()
      .find(x => x.key === "user:101")
      .value.should.deepEqual({
        username: "chad"
      });
  });

  it(`Sets a single field in a hash`, async () => {
    await db.open("testdb").hset("user:99", { verified: 0 });
    db
      .__data()
      .find(x => x.key === "user:100")
      .value.should.deepEqual({
        username: "janie",
        country: "India",
        verified: 0
      });
  });

  it(`Reads fields of a hash`, async () => {
    const result = await db
      .open("testdb")
      .hmget("user:99", ["username", "verifier"]);

    result.should.deepEqual({ username: "janie", verified: 1 });
  });

  it(`Reads a single field from a hash`, async () => {
    const result = await db.open("testdb").hget("user:99", "username");
    result.should.equal("janie");
  });

  it(`Reads all fields of a hash`, async () => {
    const result = await db.open("testdb").hgetall("user:99");
    result.should.deepEqual({
      username: "janie",
      country: "India",
      verified: 0
    });
  });

  it(`Increments a field in a hash by N`, async () => {
    const result = await db.open("testdb").hincrby("user:99", "verified", 2);
    result.should.deepEqual({
      username: "janie",
      country: "India",
      verified: 3
    });
  });

  it(`Increments a field in a hash by float N`, async () => {
    const result = await db.open("testdb").hincrby("user:99", "verified", 2.1);
    result.should.deepEqual({
      username: "janie",
      country: "India",
      verified: 3.1
    });
  });
});
