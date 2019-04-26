'use strict';

const MongoClient = require('mongodb').MongoClient;

let client = null;

/**
 * Returns a Mongo Collection,
 * @param {Object} params
 * @param {String} params.mongoUri Database connection string for Mongo
 * @param {String} params.dbName Name of the Mongo database
 * @param {String} params.collectionName Name of the collection to use
 * @returns {MongoCollection}
 */
async function getCollection(params) {
    if (client == null) {
        if (!params.mongoUri || !params.dbName || !params.collectionName) {
            throw new Error('mongoUri, dbName, and collectionName are required action params. See manifest.yaml.')
        }

        client = await MongoClient.connect(params.mongoUri).catch((err) => {
            throw new Error('Couldn\'t connect to Mongo: ' + err);
        });
    }

    return client.db(params.dbName).collection(params.collectionName);
}

module.exports = getCollection;
