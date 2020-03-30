const { deleteOldBatches } = require('../../lib/messagesLogs');

global.main = async function(params) {
    return deleteOldBatches(params)
}

module.exports = global.main;
