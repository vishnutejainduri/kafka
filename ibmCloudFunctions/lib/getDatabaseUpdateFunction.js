'use strict';

const MongoClient = require('mongodb').MongoClient;
const util = require('util');

let client = null;
const mongoConnect = util.promisify(MongoClient.connect);

/**
 * Returns a thenable function which updates data into the given database and collection.
 * @param {Object} params
 * @param {String} params.mongoUri Database connection string for Mongo
 * @param {String} params.dbName Name of the Mongo database
 * @param {String} params.collectionName Name of the collection to use
 * @returns {Promise<function>} update function that upserts data.
 */
export default async function getUpdateFunction(params) {
    if (client == null) {
        if (!params.mongoUri || !params.dbName || !params.collectionName) {
            throw new Error('mongoUri, dbName, and collectionName are required action params. See manifest.yaml.')
        }

        client = await mongoConnect(params.mongoUri);

        if (err) {
            throw new Error('Couldn\'t connect to Mongo' + err);
        }
    }

    const collection = client.db(params.dbName).collection(params.collectionName);
    const updateOne = util.promisify(collection.updateOne);
    return function(id, data) {
        return updateOne(id, data, { upsert: true });
    };
}
