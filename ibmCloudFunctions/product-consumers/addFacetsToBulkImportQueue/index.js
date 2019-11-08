const { parseFacetMessage } = require('../../lib/parseFacetMessage');
const getCollection = require('../../lib/getCollection');

global.main = async function (params) {
    console.log(JSON.stringify({
        cfName: 'addFacetsToBulkImportQueue',
        params
    }));

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    const algoliaFacetQueue = await getCollection(params);
    return Promise.all(params.messages
        .map(parseFacetMessage)
        .map((facetData) => {
            return algoliaFacetQueue.updateOne({ _id: facetData._id }, { $set: facetData }, { upsert: true })
                .catch((err) => {
                    console.error('Problem with facet ' + facetData._id);
                    console.error(err);
                    if (!(err instanceof Error)) {
                        const e = new Error();
                        e.originalError = err;
                        e.attemptedDocument = facetData;
                        return e;
                    }

                    err.attemptedDocument = facetData;
                    return err;
                })
        })
    ).then((results) => {
        const errors = results.filter((res) => res instanceof Error);
        if (errors.length > 0) {
            const e = new Error(`${errors.length} of ${results.length} updates failed. See 'failedUpdatesErrors'.`);
            e.failedUpdatesErrors = errors;
            e.successfulUpdatesResults = results.filter((res) => !(res instanceof Error));
            throw e;
        }
    });
}

module.exports = global.main;
