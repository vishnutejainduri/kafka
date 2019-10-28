const createError = (originalError, name, message) => {
    const error = new Error(`${message} --- Caused by: ${originalError.message}`);
    error.name = `${name} --- Caused by: ${originalError.name || originalError.name}`;
    error.code = error.name; // https://github.com/nodejs/help/issues/789
    error.stack = originalError.stack;
    return error;
}

module.exports = {
    failedDbConnection: (originalError) => createError(
        originalError,
        'failed-db-connection',
        'Failed to connect to db.'
    ),
    consumeInventoryMessage: {
        failed: (originalError, paramsExcludingMessages) => createError(
            originalError,
            'failed-consume-inventory-message',
            `Failure in run of consume inventory message; params excluding messages: ${paramsExcludingMessages}.`
        ),
        failedUpdateInventory: (originalError, inventoryData) => createError(
            originalError,
            'failed-inventory-update',
            `Failed to update inventory; inventory: ${inventoryData}.`
        ),
        failedUpdateStyle: (originalError, styleId) => createError(
            originalError,
            'failed-style-update',
            `Failed to update style; style Id: ${styleId}.`
        )
    }
}
