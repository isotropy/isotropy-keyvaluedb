import Db from "./db";

const databases = {};

export function init(dbName, objects) {
  const db = new Db(objects);
  databases[dbName] = db;
}

export async function open(dbName) {
  return databases[dbName].open();
}

export function __data(dbName) {
  return databases[dbName].objects;
}
