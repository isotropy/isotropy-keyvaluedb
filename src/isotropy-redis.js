import Db from "./db";

const databases = {};

export function init(dbName, objects) {
  const db = new Db(objects);
  databases[dbName] = db;
}

export function open(dbName) {
  return databases[dbName];
}

export function __data(dbName) {
  return databases[dbName].objects;
}
