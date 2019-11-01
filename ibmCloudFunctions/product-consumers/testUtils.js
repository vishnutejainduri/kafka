const mocks = {
    mongodb: () => ({
        MongoClient: {
            connect: async () => ({
                db: () => ({
                    collection: (collection) => collection === 'updateAlgoliaStyleCount'
                    ? ({
                        insert: () => ({
                            id: "success"
                        })
                    })
                    : ({
                        findOne: (params) => (params._id === "10" ? null : {})
                    })
                })
            })
        }
    }),
    algoliasearch: () => () =>({
        initIndex: () => ({
            partialUpdateObjects: async () => {}
        })
    })
}

module.exports = {
    mocks
}
