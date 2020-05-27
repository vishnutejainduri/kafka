const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');
const { productApiRequest } = require('../../lib/productApi');
const createError = require('../../lib/createError');

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
    console.log(JSON.stringify({
        cfName: 'updateAlgoliaImage',
        params
    }));

    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        throw new Error('Requires Algolia configuration. See manifest.yml');
    }

    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        client.setTimeouts({
            connect: 600000,
            read: 600000,
            write: 600000
        });
        index = client.initIndex(params.algoliaIndexName);
    }

    let algoliaImageProcessingQueue;
    let styles;
    let updateAlgoliaImageCount;
    let mediaContainers;
    try {
        algoliaImageProcessingQueue = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName);
        updateAlgoliaImageCount = await getCollection(params, 'updateAlgoliaImageCount');
        mediaContainers =  await algoliaImageProcessingQueue.find().limit(40).toArray();
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

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
                let zoomUrl = null;
                if (imageMedia && imageMedia.data && imageMedia.data.length) {
                    const thumbnail = imageMedia.data[0].images.find((image) => image.qualifier === 'HRSTORE');
                    const zoom = imageMedia.data[0].images.find((image) => image.qualifier === 'HRZOOM');
                    if (thumbnail) {
                        url = thumbnail.url;
                    }
                    if (zoom) {
                        zoomUrl = zoom.url;
                    }
                }

                if (url || zoomUrl) {
                    imagesToBeSynced.push({
                        mediaContainer,
                        url,
                        zoomUrl,
                        hasImage: true
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
                    image: imageData.url,
                    imageZoom: imageData.zoomUrl,
                    hasImage: imageData.hasImage
                };
            });
        const mediaContainerIds = imagesToBeSynced.map((imageData) => imageData.mediaContainer._id)
            .concat(noImagesAvailable);

        return (algoliaUpdates.length
            ? index.partialUpdateObjects(algoliaUpdates, true)
            : Promise.resolve())
            .then(() => algoliaImageProcessingQueue.deleteMany({ _id: { $in: mediaContainerIds } }))
            .then(() => updateAlgoliaImageCount.insert({ batchSize: algoliaUpdates.length }))
            .then((result) => console.log('deleted from queue: ' + result.deletedCount))
            .then(() => console.log('Updated images for containers ', mediaContainerIds));
    });
}

module.exports = global.main;
