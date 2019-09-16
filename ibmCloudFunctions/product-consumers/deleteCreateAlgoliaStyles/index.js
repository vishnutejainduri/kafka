const algoliasearch = require('algoliasearch');
const getCollection = require('../../lib/getCollection');

let client = null;
let index = null;

global.main = async function (params) {
    if (!params.algoliaIndexName || !params.algoliaApiKey || !params.algoliaAppId) {
        throw new Error('Requires Algolia configuration. See manifest.yml');
    }

    if (index === null) {
        client = algoliasearch(params.algoliaAppId, params.algoliaApiKey);
        index = client.initIndex(params.algoliaIndexName);
    }

    const [algoliaDeleteCreateQueue, styles] = await Promise.all([
        getCollection(params),
        getCollection(params, params.stylesCollectionName)
    ]);
    const recordsToCheck = await algoliaDeleteCreateQueue.find().sort({"insertionTime":1}).limit(200).toArray();

    const recordsToDelete = recordsToCheck.filter((record) => record.delete);
    const recordsToCreate = recordsToCheck.filter((record) => record.create);

    const algoliaStylesToDelete = recordsToDelete.map((record) => record.styleId);
    const deletionRecordsToDelete = recordsToDelete.map((record) => record._id);

    const algoliaStylesToInsert = recordsToCreate.map((record) => record.styleId);
    const creationRecordsToDelete = recordsToCreate.map((record) => record._id);

    const algoliaOperations = [];

    let stylesToBeCreated = await Promise.all(algoliaStylesToInsert.map(async (styleId) => {
      let styleDataToSync = {};
      const styleData = await styles.findOne({ _id: styleId }, { projection: {
        isOutlet: 0
      }});
      if (!styleData) return null;

      styleDataToSync = styleData;
      styleDataToSync.objectID = styleId;

      return styleDataToSync;
    }));
    stylesToBeCreated = stylesToBeCreated.filter((styleData) => styleData);

    if (stylesToBeCreated.length) {
        algoliaOperations.push(index.addObjects(stylesToBeCreated, true)
            .then(() => algoliaDeleteCreateQueue.deleteMany({ _id: { $in: creationRecordsToDelete } }))
            .then(() => console.log('Inserted for styles ', algoliaStylesToInsert))
        );
    } else {
        console.log('No inserts to process.');
        algoliaOperations.push(algoliaDeleteCreateQueue.deleteMany({ _id: { $in: creationRecordsToDelete } }));
    }

    if (algoliaStylesToDelete.length) {
      algoliaOperations.push(index.deleteObjects(algoliaStylesToDelete, true)
          .then(() => algoliaDeleteCreateQueue.deleteMany({ _id: { $in: deletionRecordsToDelete } }))
          .then(() => console.log('Deleted availability for styles ', algoliaStylesToDelete))
      );
    } else {
        console.log('No deletions to process.');
        algoliaOperations.push(algoliaDeleteCreateQueue.deleteMany({ _id: { $in: deletionRecordsToDelete } }));
    }

    return Promise.all(algoliaOperations).then(() => console.log('Finished'));
}

module.exports = global.main;
