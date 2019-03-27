const MongoClient = require('mongodb').MongoClient;
const util = require('util');

const topicName = 'product-connect-jdbc-CATALOG';
const uri = "mongodb://admin:LADZABDYIEAMEVCV@portal-ssl1084-2.bmix-wdc-yp-1410c9d4-631d-4225-8112-258dd1209402.1648250576.composedb.com:17867,portal-ssl1028-0.bmix-wdc-yp-1410c9d4-631d-4225-8112-258dd1209402.1648250576.composedb.com:17867/compose?authSource=admin&ssl=true";
const dbName = 'compose';
const collectionName = 'styles';
// Map of source attribute names to mapped name. Translatable attributes are suffixed with _EN, _ENG, or _FR.
const translatableAttributeMap = {
    'BRAND_NAME': 'brandName',
    'DESC': 'name',
    'MARKET_DESC': 'marketingDescription',
    'DETAIL_DESC3': 'construction',
    'FABRICANDMATERIAL': 'fabricAndMaterials',
    'SIZE_DESC': 'styleAndMeasurements',
    'CAREINSTRUCTIONS': 'careInstructions',
    'ADVICE': 'advice',
    'COLOUR_DESC': 'colour',
    'COLOURGROUP': 'colourGroup'
};
// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    'STYLEID': 'styleId',
    'CATAGORY': 'level1Category',
    'CATAGORY_LEVEL_1A': 'level2Category',
    'CATAGORY_LEVEL_2A': 'level3Category',
    'WEBSTATUS': 'webStatus',
    'SEASON_CD': 'season',
    'COLORID': 'colourId',
    'APPROVED_FOR_WEB': 'approvedForWeb',
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
    const styles = client.db(db).collection(collectionName);
    const updateOne = util.promisify(styles.updateOne);
    const promise = new Promise().resolve();
    params.messages.forEach((msg) => {
        if (msg.topic !== topicName) {
            return;
        }

        // Re-map atttributes
        const styleData = {};
        for (let sourceAttributeName in translatableAttributeMap) {
            styleData[translatableAttributeMap[sourceAttributeName]] = {
                'en': msg.value[sourceAttributeName + '_EN'] || msg.value[sourceAttributeName + '_ENG'],
                'fr': msg.value[sourceAttributeName + '_FR']
            }
        }
        for (let sourceAttributeName in attributeMap) {
            styleData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
        }

        // perform updates serially to avoid opening too many connections
        promise.then(() => {
            return updateOne(
                {
                    id: styleData.id
                },
                styleData,
                {
                    upsert: true
                }
            )
        });
    });

    return promise;
}

exports.main = main;
