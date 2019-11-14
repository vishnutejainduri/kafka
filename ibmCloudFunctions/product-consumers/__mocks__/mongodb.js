// Note: it is sad that all of the mocks should stay here,
// but jest supports only one mock per module: https://github.com/facebook/jest/issues/2070
// it kinda makes sense, because in the same application, there is only one instance of each module
// we could possibly add jest as a dependency of each cloud function, but that would complicately the test process
// Aleks: split up the mocks a bit, trying to get algoliasearch seperate and not importing each of these mock modules everytime per CF

const getCollection = (collectionName) => {
    switch(collectionName) {
        case 'addFacetsToBulkImportQueue':
            return {
                updateOne: async ({ _id }) => ({ _id })
            }; 
        case 'updateAlgoliaStyleCount':
            return {
                insert: async () => ({
                    id: "success"
                })
            };
        case 'consumeDep27FulfillMessage':
            return {
                updateOne: async ({ _id }) => ({ _id })
            }; 
        case 'consumeStoresFulfillMessage':
            return {
                updateOne: async ({ _id }) => ({ _id })
            }; 
        case 'consumeStoresMessage':
            return {
                updateOne: async ({ _id }) => ({ _id })
            }; 
        case 'consumeThesholdMessage':
            return {
                updateOne: async ({ _id }) => ({ _id })
            }; 
        default:
            return {
                findOne: async (params) => (params._id === "10" ? null : {}),
                updateOne: async () => ({})
            }
    }
}

const mongodb = {
    MongoClient: {
        connect: async () => ({
            db: (dbName = '') => ({
                collection: getCollection
            })
        })
    }
};


module.exports = mongodb
