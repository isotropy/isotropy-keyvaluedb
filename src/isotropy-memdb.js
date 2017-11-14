const databases = {};

export function init(dbName, collections) {
  database[dbName] = collections;
}

export function open(dbName) {
  return new Db(datbase[dbName]);
}

