const { deleteOldBatches } = require('../../lib/messagesLogs');

global.main = async function(params) {
    const persitenceDays = params.messagesLogsPersistenceDays ? Number(params.messagesLogsPersistenceDays) : 60;
    const cutoff = (new Date()).getTime() - 1000 * 60 * 60 * 24 * persitenceDays
    const result = await deleteOldBatches(params, cutoff);
    return {
        persitenceDays,
        cutoff,
        result
    }
}

module.exports = global.main;
