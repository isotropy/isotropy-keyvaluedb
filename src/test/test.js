import should from "should";
import * as babel from "babel-core";
import sourceMapSupport from "source-map-support";
import { log } from "util";
import db from "../isotropy-webstore";

sourceMapSupport.install();

function table(name) {}

describe("Isotropy FS", () => {
  beforeEach(() => {
    const collections = [
      {
        name: "sites",
        objects: [
          {
            name: "site1",
            data: "https://www.google.com",
            tags: ["search", "software"]
          },
          {
            name: "site2",
            data: "https://www.apple.com",
            expiry: 1510800000000,
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
          }
        ]
      },
      {
        name: "users",
        objects: [
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
          }
        ]
      }
    ];

    db.init(collections);
  });

  it(`Creates a connection`, async () => {
    const conn = db.connection(connStr);
    conn.connectionString.should.equal(connStr);
  });

  it(`Returns a list of collections`, async () => {
    const results = db.connection(connStr).collections();
    results.should.deepEqual(["sites", "users"]);
  });

  it(`Returns a list of objects in collection`, async () => {
    const results = db
      .connection(connStr)
      .collection("users")
      .keys();

    results.length.should.equal(["site1", "site2", "site3", "site4"]);
  });

  it(`Fetches an object by name`, async () => {
    const result = await db
      .connection(connStr)
      .collection("users")
      .get("user1");

    result.should.equal("jeswin");
  });

  it(`Fetches objects by tag`, async () => {
    const result = await db
      .connection(connStr)
      .collection("users")
      .getByTag("user");

    result.should.deepEqual(["deep", "tommi"]);
  });

  it(`Fetches tags of an object`, async () => {
    const result = await db
      .connection(connStr)
      .collection("users")
      .getTagsOf("user1");

    result.should.deepEqual(["admin"]);
  });

  it(`Fetches expiry of object`, async () => {
    const result = await db
      .connection(connStr)
      .collection("sites")
      .getExpiryOf("site2");

    result.should.deepEqual(1510800000000);
  });

  it(`Inserts a new object`, async () => {
    await db
      .connection(connStr)
      .collection("users")
      .add("user5", "janie", { expiry: 1510800000000, tags: ["user"] });

    __collection("users")
      .objects.filter(x => x.name === "user5")
      .length.should.equal(1);
  });

  it("Creates an update key (for uploads)", async () => {
    const result = await db
      .connection(connStr)
      .collection("users")
      .createKey("user10", { expiry: 1510800000000, tags: ["user"] });

    result.should.equal(__collection("users").keys[0].id);

    __collection("users").keys.length.should.equal(1);

    __collection("users").keys[0].name.should.equal("user10");
    __collection("users").keys[0].expiry.should.equal(1510800000000);
    __collection("users").keys[0].tags.should.deepEqual(["user"]);
  });

  it("Creates multiple update keys (for uploads)", async () => {
    const result = await db
      .connection(connStr)
      .collection("users")
      .createKeys([
        ["user10", { expiry: 1510800000000, tags: ["user"] }],
        ["user11", { expiry: 1510800000000, tags: ["admin"] }]
      ]);

    result.length.should.equal(2);
    result[0].should.equal(__collection("users").keys[0].id);
    result[1].should.equal(__collection("users").keys[1].id);

    __collection("users").keys.length.should.equal(2);

    __collection("users").keys[0].name.should.equal("user10");
    __collection("users").keys[0].expiry.should.equal(1510800000000);
    __collection("users").keys[0].tags.should.deepEqual(["user"]);

    __collection("users").keys[1].name.should.equal("user11");
    __collection("users").keys[1].expiry.should.equal(1510800000000);
    __collection("users").keys[1].tags.should.deepEqual(["admin"]);
  });

  it(`Deletes an object`, async () => {
    const result = await db
      .connection(connStr)
      .collection("users")
      .remove("user1");

    __collection("users")
      .objects.filter(x => x.name === "user1")
      .length.should.be.empty();
  });

  it(`Deletes many objects`, async () => {
    const result = await db
      .connection(connStr)
      .collection("users")
      .remove(["user1", "user2"]);

    __collection("users")
      .objects.filter(x => x.name === "user1" || x.name === "user2")
      .length.should.be.empty();
  });
});
