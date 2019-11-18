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
async function getCollection(params, collectionName = null) {
    // do not use this function in Promise.all: https://stackoverflow.com/q/58919867/12144949
    if (client == null) {
        if (!params.mongoUri || !params.dbName || !params.collectionName || !params.mongoCertificateBase64) {
            throw new Error('mongoUri, dbName, and collectionName are required action params. See manifest.yaml.')
        }

        const ca = [Buffer.from(params.mongoCertificateBase64, 'base64')];
        const options = {
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            useNewUrlParser: true
        };

        client = await MongoClient.connect(params.mongoUri, options).catch((err) => {
            throw new Error('Couldn\'t connect to Mongo: ' + err);
        });
    }

    const collection = collectionName || params.collectionName;
    return client.db(params.dbName).collection(collection);
}

module.exports = getCollection;
