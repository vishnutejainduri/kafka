const algoliasearch = require('algoliasearch');
const getCollection = require('../lib/getCollection');

let client = null;
let index = null;

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
        promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]));

global.main = async function (params) {
    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        throw new Error('Requires Algolia configuration. See manifest.yml');
    }

    if (!params.productApiClientId || !params.productApiHost) {
        throw new Error('Requires an Event Streams topic.');
    }

    // TODO make sure this is fetching from params correctly
    const productApiParams = {
        baseUrl: params.productApiHost,
        headers: {
            'X-IBM-Client-Id': params.productApiClientId,
            accept: 'application/json'
        },
        json: true
    };

    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        index = client.initIndex(params.algoliaIndexName);
    }

    const algoliaImageProcessingQueue = await getCollection(params);
    const imageReadyChecks = [];
    const imagesToBeSynced = [];
    algoliaImageProcessingQueue.find().limit(200).forEach(function (mediaContainer) {
        imageReadyChecks.push(() => {
            const requestParams = Object.assign({}, productApiParams, {uri: `/media/${mediaContainer.code}/main`});
            return request(requestParams)
                .then((imageMedia) => {
                    let imagePath = null;
                    if (imageMedia && imageMedia.data && imageMedia.data.length) {
                        const thumbnail = imageMedia.data[0].images.find((image) => image.qualifier === 'HRSTORE');
                        if (thumbnail) {
                            imagePath = thumbnail.url;
                        }
                    }

                    if (imagePath) {
                        imagesToBeSynced.push({
                            mediaContainer,
                            imagePath
                        });
                    }
                })
                .catch(() => {
                    console.log('Image not ready for style ', mediaContainer.code);
                });
        });
    });

    // Run the image ready checks serially to avoid overloading the Image API
    serial(imageReadyChecks).then(() => {
        const algoliaUpdates = imagesToBeSynced.map((imageData) => {
            return {
                objectId: imageData.mediaContainer.code.match(/\d+/)[0] || imageData.mediaContainer.code,
                image: imageData.imagePath
            };
        });
        const mediaContainerIds = imagesToBeSynced.map((imageData) => imageData.mediaContainer._id);

        return index.partialUpdateObjects(algoliaUpdates, true)
            .then(() => algoliaImageProcessingQueue.deleteMany({ _id: { $in: mediaContainerIds } }))
            .then(() => console.log('Updated images for containers ', mediaContainerIds));
    });
}

module.exports = global.main;
