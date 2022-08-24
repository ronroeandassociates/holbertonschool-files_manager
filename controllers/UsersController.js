import dbClient from '../utils/db';

const SHA1 = require('sha1');
const { v4: uuidv4 } = require('uuid');

class UsersController {
  static async postNew(req, res) {
    const id = uuidv4();

    if (!('email' in req.body)) {
      return res.status(400).send({ error: 'Missing email' });
    }

    if (!('password' in req.body)) {
      return res.status(400).send({ error: 'Missing password' });
    }

    const db = await dbClient.client.collection('users').findOne({ email: req.body.email });
    if (db) {
      return res.status(400).send('Already exist');
    }

    const user = {
      id,
      email: req.body.email,
      password: SHA1(req.body.password),
    };

    await dbClient.client.collection('users').insertOne(user);
    return res.status(201).send({ id, email: req.body.email });
  }
}

export default UsersController;
