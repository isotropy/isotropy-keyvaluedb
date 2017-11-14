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
    const result = await db.open("testdb").keys();

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

  it(`Returns keys starting with`, async () => {
    const result = await db.open("testdb").keysStartingWith("site");
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
      "The key countries holds an array. Use lrange instead of get."
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
      "The key user:99 holds an object. Use hmget or hget instead of get."
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
    const result = await db.open("testdb").incrBy("total", 10);

    result.should.equal(1010);
    db
      .__data("testdb")
      .find(x => x.key === "total")
      .value.should.equal(1010);
  });

  it(`Increment a value by Float N`, async () => {
    const result = await db.open("testdb").incrByFloat("total", 10.45);

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
    const result = await db.open("testdb").decrBy("total", 10);

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

    ex.message.should.equal("The key countries does not hold a string or number.");
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
      .expiry.should.be.lessThan(now + 11000)
  });

  it(`Sets an expiry`, async () => {
    await db.open("testdb").expire("site1", 10);
    
    const now = Date.now();    
    db
      .__data("testdb")
      .find(x => x.key === "site1")
      .expiry.should.be.lessThan(now + 11000)
  });

  it(`Creates a list`, async () => {
    const result = await db.open("testdb").rpush("fruits", ["apple", "mango", "pear"]);
    result.should.equal(3)
    db
      .__data("testdb")
      .find(x => x.key === "fruits")
      .value.should.deepEqual(["apple", "mango", "pear"]);
  });

  it(`Pushes items to an existing list`, async () => {
    const result = await db.open("testdb").rpush("countries", ["bulgaria", "sweden"]);
    result.should.equal(5)
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

  // it(`Gets an item at index`, async () => {
  //   const result = await db.open("testdb").lindex("countries", 1);
  //   result.should.deepEqual("france");
  // });

  // it(`Sets an item at index`, async () => {
  //   const result = await db.open("testdb").lset("countries", 1, "thailand");
  //   db
  //     .__data("testdb")
  //     .find(x => x.key === "countries")
  //     .value.should.deepEqual(["vietnam", "thailand", "belgium"]);
  // });

  // it(`Gets a list`, async () => {
  //   const result = await db.open("testdb").lrange("countries");
  //   result.should.deepEqual(["vietnam", "france", "belgium"]);
  // });

  // it(`Gets a list range`, async () => {
  //   const result = await db.open("testdb").lrange("countries", 1, 2);
  //   result.should.deepEqual(["france", "belgium"]);
  // });

  // it(`Removes from a list`, async () => {
  //   await await db.open("testdb").lrem("countries", "belgium");
  //   result.should.deepEqual(["vietnam", "france"]);
  // });

  // it(`Trims a list`, async () => {
  //   await await db.open("testdb").ltrim("countries", 1, 2);
  //   db
  //     .__data("testdb")
  //     .find(x => x.key === "countries")
  //     .value.should.deepEqual(["france", "belgium"]);
  // });

  // it(`Gets the length of a list`, async () => {
  //   const result = await db.open("testdb").llen("countries");
  //   result.length.should.equal(3);
  // });

  // it(`Creates a hash`, async () => {
  //   await db
  //     .open("testdb")
  //     .hmset("user:100", { username: "jeswin", country: "India", verified: 1 });
  //   db
  //     .__data("testdb")
  //     .find(x => x.key === "user:100")
  //     .value.should.deepEqual({
  //       username: "jeswin",
  //       country: "India",
  //       verified: 1
  //     });
  // });

  // it(`Creates a hash with a single field`, async () => {
  //   await db.open("testdb").hset("user:101", { username: "chad" });
  //   db
  //     .__data("testdb")
  //     .find(x => x.key === "user:101")
  //     .value.should.deepEqual({
  //       username: "chad"
  //     });
  // });

  // it(`Sets a single field in a hash`, async () => {
  //   await db.open("testdb").hset("user:99", { verified: 0 });
  //   db
  //     .__data("testdb")
  //     .find(x => x.key === "user:100")
  //     .value.should.deepEqual({
  //       username: "janie",
  //       country: "India",
  //       verified: 0
  //     });
  // });

  // it(`Reads fields of a hash`, async () => {
  //   const result = await db
  //     .open("testdb")
  //     .hmget("user:99", ["username", "verifier"]);

  //   result.should.deepEqual({ username: "janie", verified: 1 });
  // });

  // it(`Reads a single field from a hash`, async () => {
  //   const result = await db.open("testdb").hget("user:99", "username");
  //   result.should.equal("janie");
  // });

  // it(`Reads all fields of a hash`, async () => {
  //   const result = await db.open("testdb").hgetall("user:99");
  //   result.should.deepEqual({
  //     username: "janie",
  //     country: "India",
  //     verified: 0
  //   });
  // });

  // it(`Increments a field in a hash by N`, async () => {
  //   const result = await db.open("testdb").hincrby("user:99", "verified", 2);
  //   result.should.deepEqual({
  //     username: "janie",
  //     country: "India",
  //     verified: 3
  //   });
  // });

  // it(`Increments a field in a hash by float N`, async () => {
  //   const result = await db.open("testdb").hincrby("user:99", "verified", 2.1);
  //   result.should.deepEqual({
  //     username: "janie",
  //     country: "India",
  //     verified: 3.1
  //   });
  // });
});
