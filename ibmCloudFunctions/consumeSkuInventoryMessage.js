const MongoClient = require('mongodb').MongoClient;
const util = require('util');

const topicName = 'inventory-connect-jdbc-SKUINVENTORY';
const uri = "mongodb://admin:LADZABDYIEAMEVCV@portal-ssl1084-2.bmix-wdc-yp-1410c9d4-631d-4225-8112-258dd1209402.1648250576.composedb.com:17867,portal-ssl1028-0.bmix-wdc-yp-1410c9d4-631d-4225-8112-258dd1209402.1648250576.composedb.com:17867/compose?authSource=admin&ssl=true";
const dbName = 'compose';
const collectionName = 'inventory';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    'INV_FKSTYLENO': 'styleId',
    'FKSKU': 'skuId',
    'FKSTORENO': 'locationId',
    'QOH': 'quantityOnHand',
    'QOO': 'quantityOnOrder',
    'QBO': 'quantityBackOrder',
    'QIT': 'quantityInTransit',
    'QOHSELLABLE': 'quantityOnHandSellable',
    'QOHNOTSELLABLE': 'quantityOnHandNotSellable',
};

let client = null;
const mongoConnect = util.promisify(MongoClient.connect)
async function main(params) {
    const reused = client != null;
    if (client == null) {
        const connectionString = params.mongoUri || uri;
        client = await mongoConnect(connectionString);

        if (err) {
            throw new Error('Couldn\'t connect to Mongo' + err);
        }
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const db = params.dbName || dbName;
    const inventory = client.db(db).collection(collectionName);
    const updateOne = util.promisify(inventory.updateOne);
    const promise = new Promise().resolve();
    params.messages.forEach((msg) => {
        if (msg.topic !== topicName) {
            return;
        }

        // Re-map atttributes
        const inventoryData = {};
        for (let sourceAttributeName in attributeMap) {
            inventoryData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
        }

        // perform updates serially to avoid opening too many connections
        promise.then(() => {
            return updateOne(
                {
                    styleId: inventoryData.styleId,
                    skuId: inventoryData.skuId
                },
                inventoryData,
                {
                    upsert: true
                }
            )
        });
    });

    return promise;
}

exports.main = main;
