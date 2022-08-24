const { MongoClient } = require('mongodb');

const host = config.DB_HOST || 'localhost';
const port = config.DB_PORT || 27017;
const database = config.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/${database}`;

class DBClient {
  constructor() {
    MongoClient.connect(url, (err, db) => {
      if (!err) {
        this.client = db.db(database);
      } else {
        this.client = false;
      }
    });
  }

  isAlive() {
    if (this.client) {
      return true;
    }
    return false;
  }

  async nbUsers() {
    return this.client.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.client.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
