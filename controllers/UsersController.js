const sha1 = require('sha1');
const mongo = require('mongodb');
const Redis = require('../utils/redis');
const dbClient = require('../utils/db');

class UsersController {
  static postNew(req, res) {
    (async () => {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      const user = await dbClient.db.collection('users').findOne({ email });
      if (user) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hash = sha1(password);
      const newUser = await dbClient.db
        .collection('users')
        .insertOne({ email, password: hash });
      return res.status(201).send({ id: newUser.insertedId, email });
    })();
  }

  static getMe(req, res) {
    (async () => {
      const token = req.headers['x-token'];
      const user = await Redis.get(`auth_${token}`);
      const userID = new mongo.ObjectID(user);
      const userData = await dbClient.db
        .collection('users')
        .findOne({ _id: userID });

      if (!userData) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      return res.status(200).send({ id: userData._id, email: userData.email });
    })();
  }
}

module.exports = UsersController;
