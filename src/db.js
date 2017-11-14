import Collection from "./collection";

export default class Db {
  constructor(db) {
    this.db = db;
  }

  collection(name) {
    return new Collection(name, this);
  }
}
