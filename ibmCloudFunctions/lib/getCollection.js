'use strict';

const MongoClient = require('mongodb').MongoClient;
const Ajv = require('ajv');

const createError = require('./createError');

const mongoParametersSchema = {
    "$schema": "http://json-schema.org/draft-07/schema",
    title: "getcollection",
    description: "Parameters for obtaining a mongodb connection",
    type: "object",
    properties: {
        mongoUri: {
            type: "string",
            minLength: 1
        },
        dbName: {
            type: "string",
            minLength: 1
        },
        collectionName: {
            type: "string",
            minLength: 1
        },
        mongoCertificateBase64: {
            type: "string",
            minLength: 1
        },
    },
    "required": ["mongoUri", "dbName", "collectionName", "mongoCertificateBase64"]
 };

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(mongoParametersSchema);

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
        validate(params)
        if (validate.errors) {
            throw createError.failedSchemaValidation(
                validate.errors,
                'getCollection',
                'MongoUri, mongoCertificateBase64, dbName, and collectionName are required action params. See manifest.yaml.'
            )
        }

        const ca = [Buffer.from(params.mongoCertificateBase64, 'base64')];
        // timeout settings: https://mongodb.github.io/node-mongodb-native/2.0/reference/faq/
        const options = {
            ssl: true,
            sslValidate: true,
            sslCA: ca,
            useNewUrlParser: true,
            connectTimeoutMS: 600000, 
            socketTimeoutMS: 600000,
            maxTimeMS: 600000
        };

        client = await MongoClient.connect(params.mongoUri, options).catch((err) => {
            throw new Error('Couldn\'t connect to Mongo: ' + err);
        });
    }

    const collection = collectionName || params.collectionName;
    return client.db(params.dbName).collection(collection);
}

module.exports = getCollection;
