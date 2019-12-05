const algoliasearch = require('algoliasearch');

const getCollection = require('../../lib/getCollection');
const createError = require('../../lib/createError');
<<<<<<< HEAD
const { createLog, addErrorHandling, log } = require('../utils');
=======
>>>>>>> HRC-1041: properly throw connection errors

let client = null;
let index = null;

global.main = async function (params) {
    log(createLog.params('deleteCreateAlgoliaStyles', params));

    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        return { error: new Error('Requires Algolia configuration. See manifest.yml') };
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

<<<<<<< HEAD
    const algoliaDeleteCreateQueue = await getCollection(params)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
    const styles = await getCollection(params, params.stylesCollectionName)
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
    const createAlgoliaStylesCount = await getCollection(params, 'createAlgoliaStylesCount')
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
    const deleteAlgoliaStylesCount = await getCollection(params, 'deleteAlgoliaStylesCount')
        .catch(originalError => {
            return { error: createError.failedDbConnection(originalError) };
        });
=======
    let algoliaDeleteCreateQueue;
    let styles;
    let createAlgoliaStylesCount;
    let deleteAlgoliaStylesCount;
    try {
        algoliaDeleteCreateQueue = await getCollection(params);
        styles = await getCollection(params, params.stylesCollectionName);
        createAlgoliaStylesCount = await getCollection(params, 'createAlgoliaStylesCount');
        deleteAlgoliaStylesCount = await getCollection(params, 'deleteAlgoliaStylesCount')
    } catch (originalError) {
        return { error: createError.failedDbConnection(originalError) };
    }
>>>>>>> HRC-1041: properly throw connection errors

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
