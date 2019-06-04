/**
 * This module takes in a JSON file with styles exported from the ELCAT.CATALOG table and generates a new JSON file
 * that has properly translated entities with image and inventory data attached using our fundamental data API.
 * The output is intended to be uploaded to Algolia.
 */

const algoliasearch = require('algoliasearch');
const { parseStyleMessage, filterStyleMessages } = require('../lib/parseStyleMessage');
const getCollection = require('../lib/getCollection');
const { DateTime } = require('luxon');

const request = require('request-promise-native')
    , JSONStream = require('JSONStream')
    , fs = require('fs')
    , es = require('event-stream');

let client = null;
let index = null;

const params = {
    algoliaIndexName: 'dev_testsync',
    algoliaApiKey: 'b9b26d2f0d3fd0c87227a7aedb497245',
    algoliaAppId: 'CDROBE4GID',
    productApiClientId: '4fc13095-72ac-405a-ad4d-ea443d1686f0',
    productApiHost: 'hr-platform-api-dev.mybluemix.net',
    mongoUri: 'mongodb://admin:LADZABDYIEAMEVCV@portal-ssl1084-2.bmix-wdc-yp-1410c9d4-631d-4225-8112-258dd1209402.1648250576.composedb.com:17867,portal-ssl1028-0.bmix-wdc-yp-1410c9d4-631d-4225-8112-258dd1209402.1648250576.composedb.com:17867/compose?authSource=admin&ssl=true',
    dbName: 'compose',
    collectionName: 'stylestest'
};

const productApiParams = {
    baseUrl: 'https://myplanet-hr-product-api.mybluemix.net/',
    headers: {
        'X-IBM-Client-Id': params.productApiClientId,
        accept: 'application/json'
    },
    json: true
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function chunk(array, size) {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size;
    }
    return chunked_arr;
}

/*
 * serial executes Promises sequentially.
 * @param {funcs} An array of funcs that return promises.
 * @example
 * const urls = ['/url1', '/url2', '/url3']
 * serial(urls.map(url => () => $.ajax(url)))
 *     .then(console.log.bind(console))
 */
const serial = funcs =>
    funcs.reduce((promise, func) =>
        promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]))

global.main = async function () {
    var stream = fs.createWriteStream("new.json", {flags:'a'});
    function write(data, cb) {
        if (!stream.write(data)) {
            stream.once('drain', cb);
        } else {
            process.nextTick(cb);
        }
    }
    stream.write('[');
    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        index = client.initIndex(params.algoliaIndexName);
    }

    const styles = await getCollection(params);

    console.log('reading file')
    let rawdata = fs.readFileSync('retry-offsets-prod-2019-05-30.json'); //'./test.json');
    console.log('parsing data');
    let stylesData = JSON.parse(rawdata);
    console.log('parsed stylesdata');

    console.log('reading file')
    rawdata = fs.readFileSync('facets-grouped-prod-2019-05-30.json'); //'./test.json');
    console.log('parsing data');
    let groupedFacetsData = JSON.parse(rawdata);
    console.log('parsed facets data')

    const chunks = chunk(stylesData, 20);
    let i = 0;
    serial(chunks.map(chunk => () => {
        return new Promise(resolve => {
            console.log('init ' + i)
            i+= chunk.length;

            const mapped = chunk.filter(filterStyleMessages)
                .map(parseStyleMessage)
                // Add Algolia object ID
                .map((styleData) => {
                    styleData.objectID = styleData.id;
                    return styleData;
                })
                .map((styleData) => {
                    if (groupedFacetsData[styleData.objectID]) {
                        styleData = Object.assign({}, styleData, groupedFacetsData[styleData.objectID]);
                    }
                    return styleData;
                })
                .map((styleData) => {
                    return styles.findOne({_id: styleData._id}).then(async (existingDoc) => {
                        if (existingDoc) {
                            const newEffectiveDate = DateTime.fromSQL(styleData.effectiveDate);
                            const effectiveDateDate = DateTime.fromMillis(existingDoc.effectiveDate);
                            if (effectiveDateDate > newEffectiveDate)
                                return Promise.resolve(null);
                        }

                        // image
                        let requestParams = Object.assign({}, productApiParams, {uri: `/media/${styleData._id}/main`});
                        const imageMedia = await request(requestParams).catch((err) => {
                            console.log('request error', styleData._id, err.message);
                            return null;
                        });
                        styleData.image = null;
                        if (imageMedia && imageMedia.data && imageMedia.data.length) {
                            const thumbnail = imageMedia.data[0].images.find((image) => image.qualifier === 'HRSTORE');
                            if (thumbnail) {
                                styleData.image = thumbnail.url;
                            }
                        }

                        // inventory
                        styleData.isSellable = styleData.season === 'BASIC' || styleData.season === 'SP-19';
                        /*requestParams = Object.assign({}, productApiParams, {uri: `/inventory/${styleData._id}`});
                        const inventoryData = await request(requestParams).catch((err) => {
                            console.log('request error', styleData._id, err.message);
                            return null;
                        });
                        styleData.isSellable = false;
                        styleData.sizes = [];
                        if (inventoryData && inventoryData.data && inventoryData.data.length) {
                            const hasInventory = !!inventoryData.data.find((inventory) => inventory.quantityOnHandSellable > 0);
                            styleData.isSellable = hasInventory;
                            if (hasInventory) {
                                const skuSizes = await Promise.all(inventoryData.data
                                    .filter((inventory) => inventory.quantityOnHandSellable > 0)
                                    .map((inventory) => inventory.skuId)
                                    .map((skuId) => {
                                        requestParams = Object.assign({}, productApiParams, {uri: `/sku/${skuId}`});
                                        return request(requestParams)
                                            .then((skuData) => {
                                                if (skuData && skuData.data && skuData.data.length) {
                                                    return skuData.data[0].sizeId;
                                                }
                                            })
                                            .catch((err) => {
                                                console.log('request error', skuId, err.message);
                                                return null;
                                            });
                                    })
                                );
                                styleData.sizes = skuSizes.filter((skuSize) => skuSize);
                            }

                        }*/

                        //console.log('generated style data')
                        return Promise.resolve(JSON.stringify(styleData));
                    });
                });

            Promise.all(mapped).then((jsonStrings) => {
                const jsonString = jsonStrings
                    .filter((string) => string)
                    .reduce((acc, jsonString) => acc += jsonString + ",\n", '')
                write(jsonString, () => {
                    console.log('done');
                    sleep(500).then(resolve);
                })
            });
        })
    }));

}

global.main();
