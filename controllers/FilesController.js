import { v4 as uuidv4 } from 'uuid';
import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

const mongodb = require('mongodb');
const fs = require('fs');

class FilesController {
  static postUpload(req, res) {
    (async () => {
      const theTok = req.headers['x-token'];
      const theKey = await RedisClient.get(`auth_${theTok}`);
      if (!theKey) return res.status(401).send({ error: 'Unauthorized' });

      const {
        name,
        type,
        data,
        isPublic = false,
        parentId = 0,
      } = req.body;

      if (!name) return res.status(400).send({ error: 'Missing name' });
      if (!type) return res.status(400).send({ error: 'Missing type' });
      if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });
      if (parentId !== 0) {
        const projectId = new mongodb.ObjectId(parentId);
        const file = await DBClient.db.collection('files').findOne({ _id: projectId });
        if (!file) return res.status(400).send({ error: 'Parent not found' });
        if (file && file.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
      }
      let newFileDoc;
      if (type === 'folder') {
        newFileDoc = await DBClient.db.collection('files').insertOne({
          userId: new mongodb.ObjectId(theKey),
          name,
          type,
          isPublic,
          parentId,
        });
      } else {
        const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(FOLDER_PATH)) {
          fs.mkdirSync(FOLDER_PATH);
        }
        const localPath = `${FOLDER_PATH}/${uuidv4()}`;
        const decodedData = Buffer.from(data, 'base64').toString('utf-8');
        await fs.promises.writeFile(localPath, decodedData);
        newFileDoc = await DBClient.db.collection('files').insertOne({
          userId: new mongodb.ObjectId(theKey),
          name,
          type,
          isPublic,
          parentId,
          localPath,
        });
      }
      return res.status(201).send({
        id: newFileDoc.insertedId, userId: theKey, name, type, isPublic, parentId,
      });
    }
    )().catch((error) => {
      console.error(error);
      res.status(500).send({ error: error.toString() });
    });
  }

  static getShow(req, res) {
    (async () => {
      const theTok = req.headers['x-token'];
      const theKey = `auth_${theTok}`;
      const userId = await RedisClient.get(theKey);
      if (!userId) return res.status(401).send({ error: 'Unauthorized' });

      const { id } = req.params;
      const fileId = new mongodb.ObjectId(id);
      const fileDoc = await DBClient.db.collection('files').findOne({ _id: fileId });

      if (!fileDoc) return res.status(404).send({ error: 'Not found' });
      if (userId !== fileDoc.userId.toString()) return res.status(404).send({ error: 'Not found' });
      const returnedfileDoc = {
        id: fileDoc._id,
        userId: fileDoc.userId,
        name: fileDoc.name,
        type: fileDoc.type,
        isPublic: fileDoc.isPublic,
        parentId: fileDoc.parentId,
      };
      return res.send(returnedfileDoc);
    })();
  }

  static getIndex(req, res) {
    (async () => {
      const theTok = req.headers['x-token'];
      const theKey = `auth_${theTok}`;
      const userId = await RedisClient.get(theKey);
      if (!userId) return res.status(401).send({ error: 'Unauthorized' });

      const {
        parentId,
        page = 0,
      } = req.query;

      let files;
      if (parentId) {
        const parentIdObject = new mongodb.ObjectId(parentId);
        files = await DBClient.db.collection('files').aggregate([
          { $match: { parentId: parentIdObject } },
          { $skip: page * 20 },
          { $limit: 20 },
        ]).toArray();
      } else {
        const parentIdObject = new mongodb.ObjectId(userId);
        files = await DBClient.db.collection('files').aggregate([
          { $match: { userId: parentIdObject } },
          { $skip: page * 20 },
          { $limit: 20 },
        ]).toArray();
      }

      const filesWithUserId = files.map((file) => ({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      }));
      return res.send(filesWithUserId);
    })();
  }

  static putPublish(req, res) {
    (async () => {
      const theTok = req.headers['x-token'];
      const theKey = `auth_${theTok}`;
      const userId = await RedisClient.get(theKey);
      if (!userId) return res.status(401).send({ error: 'Unauthorized' });

      const { id } = req.params;
      const fileId = new mongodb.ObjectId(id);
      const fileDoc = await DBClient.db.collection('files').findOne({ _id: fileId });

      if (!fileDoc) return res.status(404).send({ error: 'Not found' });
      if (userId !== fileDoc.userId.toString()) return res.status(404).send({ error: 'Not found' });

      fileDoc.isPublic = true;

      const updatedFileDoc = {
        id: fileDoc._id,
        userId: fileDoc.userId,
        name: fileDoc.name,
        type: fileDoc.type,
        isPublic: fileDoc.isPublic,
        parentId: fileDoc.parentId,
      };
      return res.status(200).send(updatedFileDoc);
    })();
  }

  static putUnpublish(req, res) {
    (async () => {
      const theTok = req.headers['x-token'];
      const theKey = `auth_${theTok}`;
      const userId = await RedisClient.get(theKey);
      if (!userId) return res.status(401).send({ error: 'Unauthorized' });

      const { id } = req.params;
      const fileId = new mongodb.ObjectId(id);
      const fileDoc = await DBClient.db.collection('files').findOne({ _id: fileId });

      if (!fileDoc) return res.status(404).send({ error: 'Not found' });
      if (userId !== fileDoc.userId.toString()) return res.status(404).send({ error: 'Not found' });

      fileDoc.isPublic = false;

      const updatedFileDoc = {
        id: fileDoc._id,
        userId: fileDoc.userId,
        name: fileDoc.name,
        type: fileDoc.type,
        isPublic: fileDoc.isPublic,
        parentId: fileDoc.parentId,
      };
      return res.status(200).send(updatedFileDoc);
    })();
  }

  static getFile(req, res) {
    (async () => {
      const theTok = req.headers['x-token'];
      const userId = await RedisClient.get(`auth_${theTok}`);
      const objectId = new mongodb.ObjectId(req.params.id);
      const file = await DBClient.db.collection('files').findOne({ _id: objectId });
      if (!file) return res.status(404).send({ error: 'Not found' });
      if (!file.isPublic && (!userId || userId !== file.userId.toString())) return res.status(404).send({ error: 'Not found' });
      if (file.type === 'folder') return res.status(400).send({ error: 'A folder doesn\'t have content' });
      if (!fs.existsSync(file.localPath)) return res.status(404).send({ error: 'Not found' });

      const data = fs.readFileSync(file.localPath);
      return res.status(200).end(data);
    })();
  }
}

module.exports = FilesController;
