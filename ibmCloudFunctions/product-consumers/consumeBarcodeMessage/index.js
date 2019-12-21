const { filterBarcodeMessage, parseBarcodeMessage } = require('../../lib/parseBarcodeMessage');
const { createLog, addErrorHandling, log } = require('../utils');
const getCollection = require('../../lib/getCollection');
const storeMessages = require('../../lib/storeMessages');
const createError = require('../../lib/createError');

global.main = async function (params) {
    log(createLog.params('consumeBarcodeMessage', params));
    try {
        await storeMessages(
            {
                ...params,
                mongoUri: params.messagesMongoUri,
            },
            {
                activationId: process.env.__OW_ACTIVATION_ID,
                messages: params.messages
            }
        );
    } catch (error) {
        log(createLog.failedToStoreMessages(error));
    }

    if (!params.topicName) {
        throw new Error('Requires an Event Streams topic.');
    }

    if (!params.messages || !params.messages[0] || !params.messages[0].value) {
        throw new Error("Invalid arguments. Must include 'messages' JSON array with 'value' field");
    }

    let barcodes;
    try {
        barcodes = await getCollection(params);
    } catch (originalError) {
        throw createError.failedDbConnection(originalError);
    }

    return Promise.all(params.messages
        .filter(filterBarcodeMessage)
        .map(parseBarcodeMessage)
        .map(addErrorHandling((barcodeData) => barcodes.findOne({ _id: barcodeData._id })
            .then((existingDocument) => (existingDocument && existingDocument.lastModifiedDate)
                ? barcodes.updateOne({ _id: barcodeData._id, lastModifiedDate: { $lt: barcodeData.lastModifiedDate } }, { $set: barcodeData })
                : barcodes.updateOne({ _id: barcodeData._id }, { $set: barcodeData }, { upsert: true })
            )
            .catch((err) => {
                console.error('Problem with barcode ' + barcodeData._id);
                console.error(err);
                if (!(err instanceof Error)) {
                    const e = new Error();
                    e.originalError = err;
                    e.attemptedDocument = barcodeData;
                    return e;
                }

                err.attemptedDocument = barcodeData;
                return err;
            })
        ))
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
