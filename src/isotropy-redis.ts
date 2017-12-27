import Db from "./db";

export default class Redis {
  constructor(objects) {
    this.originalObjects = objects;
    this.__reset();
  }

  __reset() {
    this.db = new Db(this, this.originalObjects);
  }

  async open() {
    await this.db.open();
    return this.db;
  }
}
