const algoliasearch = require('algoliasearch');

const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
const { createLog, addErrorHandling, log } = require('../utils');
const { addStyleToAlgoliaAvailabilityCheckQueue } = require('./utils');

let client = null;
let index = null;

global.main = async function (params) {
    log(createLog.params('deleteCreateAlgoliaStyles', params));

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

    let algoliaDeleteCreateQueue;
    let styles;
    let createAlgoliaStylesCount;
    let deleteAlgoliaStylesCount;
    let styleAvailabilityCheckQueue;
    try {
        algoliaDeleteCreateQueue = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName);
        createAlgoliaStylesCount = await getCollection(params, 'createAlgoliaStylesCount');
        deleteAlgoliaStylesCount = await getCollection(params, 'deleteAlgoliaStylesCount')
        styleAvailabilityCheckQueue = await getCollection(params, 'styleAvailabilityCheckQueue');
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    const recordsToCheck = await algoliaDeleteCreateQueue.find().sort({"insertionTime":1}).limit(200).toArray();

    const recordsToDelete = recordsToCheck.filter((record) => record.delete);
    const recordsToCreate = recordsToCheck.filter((record) => record.create);

    const algoliaStylesToDelete = recordsToDelete.map((record) => record.styleId);
    const deletionRecordsToDelete = recordsToDelete.map((record) => record._id);

    const algoliaStylesToInsert = recordsToCreate.map((record) => record.styleId);
    const creationRecordsToDelete = recordsToCreate.map((record) => record._id);

    const algoliaOperations = [];

    let stylesToBeCreated = await Promise.all(algoliaStylesToInsert.map(addErrorHandling(async (styleId) => {
      let styleDataToSync = {};
      const styleData = await styles.findOne({ _id: styleId }, { projection: {
        isOutlet: 0
      }});
      if (!styleData) return null;

      styleDataToSync = styleData;
      styleDataToSync.objectID = styleId;

      return styleDataToSync;
    })));

    const failedStylesToBeCreated = stylesToBeCreated.filter(styleData => styleData instanceof Error);
    stylesToBeCreated = stylesToBeCreated.filter((styleData) => (styleData && !(styleData instanceof Error)));

    if (stylesToBeCreated.length) {
        algoliaOperations.push(index.addObjects(stylesToBeCreated, true)
            .then(() => algoliaDeleteCreateQueue.deleteMany({ _id: { $in: creationRecordsToDelete } }))
            .then(() => createAlgoliaStylesCount.insert({ batchSize: stylesToBeCreated.length }))
            .then(() => Promise.all(stylesToBeCreated.map(styleData => addStyleToAlgoliaAvailabilityCheckQueue(styleAvailabilityCheckQueue, styleData.id))))
            .then(() => console.log('Inserted for styles ', algoliaStylesToInsert))
        );
    } else {
        console.log('No inserts to process.');
        algoliaOperations.push(algoliaDeleteCreateQueue.deleteMany({ _id: { $in: creationRecordsToDelete } }));
    }

    if (algoliaStylesToDelete.length) {
      algoliaOperations.push(index.deleteObjects(algoliaStylesToDelete, true)
          .then(() => algoliaDeleteCreateQueue.deleteMany({ _id: { $in: deletionRecordsToDelete } }))
          .then(() => deleteAlgoliaStylesCount.insert({ batchSize: algoliaStylesToDelete.length }))
          .then(() => console.log('Deleted availability for styles ', algoliaStylesToDelete))
      );
    } else {
        console.log('No deletions to process.');
        algoliaOperations.push(algoliaDeleteCreateQueue.deleteMany({ _id: { $in: deletionRecordsToDelete } }));
    }

    if (failedStylesToBeCreated.length) {
        const error = createError.deleteCreateAlgoliaStyles.partialFailure(stylesToBeCreated, failedStylesToBeCreated);
        return { error };
    }

    await Promise.all(algoliaOperations).catch(error => ({ error }));
    console.log('Finished');
}

module.exports = global.main;
