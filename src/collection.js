export default class Collection {
  constructor(name, db) {
    this.name = name;
    this.db = db;
    this.objects = [];
  }

  add(name, value, { expiry = 4108406400000, tags = [] }) {
    this.objects = this.objects.concat({
      name,
      value,
      expiry,
      tags
    });
  }

  get(name) {
    const obj = this.objects.find(x => x.name === name);
    return obj ? obj.value : undefined;
  }

  getByTag(tag) {
    const obj = this.objects.find(x => x.tags.includes(tag));
    return obj ? obj.value : undefined;
  }

  getTagsOf(name) {
    const obj = this.objects.find(x => x.name === name);
    return obj ? obj.tags : [];
  }

  getExpiryOf(name) {
    const obj = this.objects.find(x => x.name === name);
    return obj ? obj.tags : [];
  }

  remove(items) {
    return typeof items === "string"
      ? ((this.objects = this.objects.filter(x => x.name !== items)), undefined)
      : ((this.objects = this.objects.filter(x => !items.container(x.name))),
        undefined);
  }
}
