import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(req, res) {
    const obj = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    return res.status(200).send(obj);
  }

  static async getStats(req, res) {
    const obj = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    return res.status(200).send(obj);
  }
}

export default AppController;
