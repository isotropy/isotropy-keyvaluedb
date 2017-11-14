import should from "should";
import * as babel from "babel-core";
import sourceMapSupport from "source-map-support";
import { log } from "util";
import * as db from "../isotropy-memdb";

sourceMapSupport.install();

function table(name) {}

describe("Isotropy FS", () => {
  beforeEach(() => {
    const objects = [
      {
        name: "site1",
        data: "https://www.google.com",
        tags: ["search", "software"]
      },
      {
        name: "site2",
        data: "https://www.apple.com",
        expiry: 1530800000000,
        tags: ["phones", "hardware"]
      },
      {
        name: "site3",
        data: "https://www.amazon.com",
        tags: ["software", "ecommerce"]
      },
      {
        name: "site4",
        data: "https://www.twitter.com",
        tags: ["software", "social"]
      },
      {
        name: "user1",
        data: "jeswin",
        tags: ["admin"]
      },
      {
        name: "user2",
        data: "deeps"
      },
      {
        name: "user3",
        data: "tommi"
      },
      {
        name: "countries",
        data: ["vietnam", "france", "belgium"]
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
      "countries"
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

  it(`Create a list`, async () => {
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
});
