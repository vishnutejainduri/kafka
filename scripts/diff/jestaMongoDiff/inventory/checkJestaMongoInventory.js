(require('dotenv').config())
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;

const devParams = {
  mongoUri: process.env.DEV_MONGO_URI,
  dbName: process.env.DEV_MONGO_DBNAME,
  mongoCertificateBase64: process.env.DEV_MONGO_CERTIFICATEBASE64
};

const ca = [Buffer.from(devParams.mongoCertificateBase64, 'base64')];

const options = {
    ssl: true,
    sslValidate: true,
    sslCA: ca,
    useNewUrlParser: true
};

const wstreamOutput = fs.createWriteStream('output.csv');


fs.readFile('./skuinventory.csv', 'utf-8', async (err, data) => {
    if (err) throw err;
    let dataRows = data.split('\n');
    dataRows = dataRows.filter((row) => row && row !== '')
    console.log('searching for', dataRows.length, 'records');

    const client = await MongoClient.connect(devParams.mongoUri, options);
    const inventory = client.db(devParams.dbName).collection('inventory');
    let existingCount = 0;
    await Promise.all(dataRows.map(async (result) => {
        
        resultArray = result.split(",");
        const inventoryId = `${resultArray[1]}-${resultArray[0]}-${resultArray[2]}`

        const invData = await inventory.findOne({"_id": inventoryId });
        if(invData && invData.quantityOnHandSellable == resultArray[5]) {
            existingCount++;
        } else {
            console.log(inventoryId);
            wstreamOutput.write(inventoryId + '\n')
        }
    }));
    console.log('existing count', existingCount);
});
