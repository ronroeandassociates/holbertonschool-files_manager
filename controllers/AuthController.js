const sha1 = require('sha1');
const { v4: uuid } = require('uuid');
const Redis = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
  static getConnect(req, res) {
    (async () => {
      const header = req.headers.authorization;
      const newBuffer = Buffer.from(header.split(' ')[1], 'base64').toString(
        'ascii',
      );
      const [email, password] = newBuffer.toString('utf-8').split(':');

      if (!password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await dbClient.db
        .collection('users')
        .findOne({ email, password: sha1(password) });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const newID = uuid();
      const key = `auth_${newID}`;
      await Redis.set(key, user._id.toString(), 86400);
      return res.status(200).json({ token: newID });
    })();
  }

  static getDisconnect(req, res) {
    (async () => {
      const header = req.headers['x-token'];
      const key = `auth_${header}`;

      const user = await Redis.get(key);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await Redis.del(key);
      return res.status(204).end();
    })();
  }
}

module.exports = AuthController;
