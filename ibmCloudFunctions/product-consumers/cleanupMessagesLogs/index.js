const { deleteOldBatches } = require('../../lib/messagesLogs');

global.main = async function(params) {
    return deleteOldBatches(params, params.messagesLogsPersistenceDays)
}

module.exports = global.main;
