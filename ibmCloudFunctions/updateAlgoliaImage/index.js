const algoliasearch = require('algoliasearch');
const getCollection = require('../lib/getCollection');
const { productApiRequest } = require('../lib/productApi');

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

    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        index = client.initIndex(params.algoliaIndexName);
    }

    const algoliaImageProcessingQueue = await getCollection(params);
    const mediaContainers =  await algoliaImageProcessingQueue.find().limit(50).toArray();
    const imagesToBeSynced = [];

    const isImageReadyChecks = mediaContainers.map((mediaContainer) => () => {
        return productApiRequest(params, `/media/${mediaContainer.code}/main`)
            .then((imageMedia) => {
                let url = null;
                if (imageMedia && imageMedia.data && imageMedia.data.length) {
                    const thumbnail = imageMedia.data[0].images.find((image) => image.qualifier === 'HRSTORE');
                    if (thumbnail) {
                        url = thumbnail.url;
                    }
                }

                if (url) {
                    imagesToBeSynced.push({
                        mediaContainer,
                        url
                    });
                }
            })
            .catch(() => {
                console.log('Image not ready for style ', mediaContainer.code);
            });
    });

    // Run the "is image ready" checks serially to avoid overloading the Image API
    serial(isImageReadyChecks).then(() => {
        const algoliaUpdates = imagesToBeSynced.map((imageData) => {
            return {
                objectID: imageData.mediaContainer.code.match(/\d+/)[0] || imageData.mediaContainer.code,
                image: imageData.url
            };
        });
        const mediaContainerIds = imagesToBeSynced.map((imageData) => imageData.mediaContainer._id);

        return index.partialUpdateObjects(algoliaUpdates, true)
            .then(() => algoliaImageProcessingQueue.deleteMany({ _id: { $in: mediaContainerIds } }))
            .then(() => console.log('Updated images for containers ', mediaContainerIds));
    });
}

module.exports = global.main;
