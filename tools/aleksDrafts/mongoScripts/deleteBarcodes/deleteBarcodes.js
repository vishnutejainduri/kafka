(require('dotenv').config())
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

const params = {
  mongoUri: process.env.MONGO_URI,
  dbName: "ibmclouddb",
  mongoCertificateBase64: process.env.CERT 
};

const ca = [Buffer.from(params.mongoCertificateBase64, 'base64')];
const options = {
  ssl: true,
  sslValidate: true,
  sslCA: ca,
  useNewUrlParser: true
};

MongoClient.connect(params.mongoUri, options, function(err, client) {
  const collection = client.db(params.dbName).collection('barcodes');

  fs.readFile('./barcodes.csv', 'utf-8', async (err, data) => {
    if (err) throw err;
    let dataRows = data.split('\n');
    dataRows = dataRows.slice(1)
    console.log('starting record count', dataRows.length);
    const bulk = collection.initializeUnorderedBulkOp();
    await Promise.all(dataRows.map(async (row) => {
      bulk.find({ _id: row.split('\r')[0] }).remove();
    }))
    console.log('deleting count', dataRows.length);
    bulk.execute((err, result) => {
      console.log('finished', result);
      client.close();
      console.log('DB connection closed');
    });
  });
});
