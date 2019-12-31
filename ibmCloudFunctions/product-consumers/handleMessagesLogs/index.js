
const {
    getRetryBatches
} = require('../../lib/messagesLogs');
const { addErrorHandling } = require('../utils');

const { requeueMessagesAndCleanupBatch, groupResultByStatus } = require('./utils');

global.main = async function(params) {    
    const retryBatches = await getRetryBatches(params);
    const result = await Promise.all(retryBatches.map(addErrorHandling(requeueMessagesAndCleanupBatch)));
    return groupResultByStatus(result)
}

module.exports = global.main;
