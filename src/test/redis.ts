import { redis, Redis } from "../isotropy-redis";

export default redis([
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
    value: "jeswin"
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
]);
