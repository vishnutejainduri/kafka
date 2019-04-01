const getDatabaseUpdateFunction = require('./lib/getDatabaseUpdateFunction');

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

async function main(params) {
    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const updateInventory = getDatabaseUpdateFunction(params);
    const promise = new Promise().resolve();
    params.messages
        .filter((msg) => msg.topic === params.topicName)
        .map((msg) => {
            // Re-map atttributes
            const inventoryData = {};
            for (let sourceAttributeName in attributeMap) {
                inventoryData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
            }

            return inventoryData;
        })
        .forEach((inventoryData) => {
            // perform updates serially to avoid opening too many connections
            promise.then(() => {
                return updateInventory(
                    {
                        styleId: inventoryData.styleId,
                        skuId: inventoryData.skuId
                    },
                    inventoryData
                );
            });
            // TODO error handling - this MUST report errors and which offests must be retried
        });

    return promise;
}

exports.main = main;
