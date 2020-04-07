// Note: it is sad that all of the mocks should stay here,
// but jest supports only one mock per module: https://github.com/facebook/jest/issues/2070
// it kinda makes sense, because in the same application, there is only one instance of each module
// we could possibly add jest as a dependency of each cloud function, but that would complicately the test process
// Aleks: split up the mocks a bit, trying to get algoliasearch seperate and not importing each of these mock modules everytime per CF

const getCollection = (collectionName) => {
    switch(collectionName) {
        case 'messagesByActivationIds':
            return {
                testId: 'messagesByActivationIds',
            };
        case 'addFacetsToBulkImportQueue':
            return {
                updateOne: async ({ _id }) => ({ _id })
            }; 
        case 'updateAlgoliaStyleCount':
            return {
                insert: async () => ({
                    id: 'success'
                })
            };
        case 'updateAlgoliaPriceCount':
            return {
                insert: async () => ({
                    id: 'success'
                })
            };
        case 'updateAlgoliaInventoryCount':
            return {
                insert: async () => ({
                    id: 'success'
                })
            };
        case 'stores':
            return {
                updateOne: async ({ _id }) => ({ _id }),
                findOne: async () => ({ _id: 'success', canOnlineFulfill: true, canFulfillDep27: true, isOutlet: false, isVisible: true }),
            }; 
        case 'skus':
            return {
                updateOne: async ({ _id }) => ({ _id }),
                findOne: async () => ({ _id: 'success' }),
                find: () => ({
                  toArray: async () => ([{ _id: 'success' }])
                })
            }; 
        case 'barcode':
            return {
                updateOne: async ({ _id }) => ({ _id })
            }; 
        case 'inventory':
            return {
                find: () => ({
                  toArray: async () => ([{ _id: 'success' }])
                }),
                aggregate: () => ({
                  toArray: async () => ([{ _id: 'success' }])
                })
            }; 
        case 'styleAvailabilityCheckQueue':
            return {
                updateOne: async ({ _id }) => ({ _id }),
                find: () => ({ 
                  limit: () => ({
                    toArray: async () => ([{ _id: 'success', styleId: 'success' }]) 
                  })
                }),
                deleteMany: async () => ({})
            }; 
        case 'bulkAtsRecalculateQueue':
            return {
                updateOne: async ({ _id }) => ({ _id }),
                find: () => ({ 
                  sort: () => ({ 
                    limit: () => ({
                      toArray: async () => ([{ _id: 'success' }]) 
                    })
                  }),
                }),
                deleteMany: async () => ({}),
                initializeUnorderedBulkOp: () => ({
                  find: () => ({
                    upsert: () => ({
                      updateOne: async () => ({
                        _id: 'success'
                      })
                    })
                  })
                })
            }; 
        case 'styles':
            return {
                updateOne: async ({ _id }) => ({ _id }),
                findOne: async () => ({ _id: 'success', styleId: 'success', ats: [] }),
            }; 
        case 'prices':
            return {
                updateOne: async ({ _id }) => ({ _id }),
                findOne: async () => ({ _id: 'success', styleId: 'styleId', onlineSalePrice: 'onlineSalePrice', inStoreSalePrice: 'inStoreSalePrice' }),
            }; 
        default:
            return {
                findOne: async (params) => (params._id === '10' ? null : {}),
                updateOne: async () => ({})
            }
    }
}

const mongodb = {
    MongoClient: {
        connect: async () => ({
            db: () => ({
                collection: getCollection
            })
        })
    }
};


module.exports = mongodb
