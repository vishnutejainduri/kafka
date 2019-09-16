const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const { productApiRequest } = require('../../lib/productApi');

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
    const styles = await getCollection(params, params.stylesCollectionName);
    const updateAlgoliaImageCount = await getCollection(params, 'updateAlgoliaImageCount');
    const mediaContainers =  await algoliaImageProcessingQueue.find().limit(40).toArray();
    const imagesToBeSynced = [];
    const noImagesAvailable = [];

    const isImageReadyChecks = mediaContainers.map((mediaContainer) => async () => {
        // Many images are for styles not in the DPM (for example, skus). Filter those out
        const styleData = await styles.findOne({_id: mediaContainer.code});
        if (!styleData || styleData.isOutlet) {
            noImagesAvailable.push(mediaContainer._id);
            return null;
        }

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
                } else {
                    // This mediacontainer has images, but none in our crop OR no URL for some reason
                    noImagesAvailable.push(mediaContainer._id);
                }
            })
            .catch(() => {
                console.log('Image not ready for style ', mediaContainer.code);
            });
    }).filter((promise) => promise);

    if (!isImageReadyChecks.length) {
        return algoliaImageProcessingQueue.deleteMany({ _id: { $in: noImagesAvailable } })
            .then((result) => console.log('deleted from queue: ' + result.deletedCount));
    }

    // Run the "is image ready" checks serially to avoid overloading the Image API
    return serial(isImageReadyChecks).then(() => {
        const algoliaUpdates = imagesToBeSynced
            // some media containers reference non-standard styles
            .filter((imageData) => imageData.mediaContainer.code.match(/\d+/))
            .map((imageData) => {
                return {
                    objectID: imageData.mediaContainer.code.match(/\d+/)[0] || imageData.mediaContainer.code,
                    image: imageData.url
                };
            });
        const mediaContainerIds = imagesToBeSynced.map((imageData) => imageData.mediaContainer._id)
            .concat(noImagesAvailable);

        return (algoliaUpdates.length
            ? index.partialUpdateObjects(algoliaUpdates, true)
            : Promise.resolve())
            .then(() => algoliaImageProcessingQueue.deleteMany({ _id: { $in: mediaContainerIds } }))
            .then((result) => updateAlgoliaImageCount.insert({ batchSize: algoliaUpdates.length }))
            .then((result) => console.log('deleted from queue: ' + result.deletedCount))
            .then(() => console.log('Updated images for containers ', mediaContainerIds));
    });
}

module.exports = global.main;
