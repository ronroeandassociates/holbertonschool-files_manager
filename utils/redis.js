const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (error) => {
      console.log(error);
    });
    this.getAsync = promisify(this.client.get).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const value = await this.getAsync(key);
    return value;
  }

  async set(key, value, second) {
    this.client.set(key, value);
    this.client.expire(key, second);
  }

  async del(key) {
    return this.client.del(key);
  }

}
const redisClient = new RedisClient();
export default redisClient;
