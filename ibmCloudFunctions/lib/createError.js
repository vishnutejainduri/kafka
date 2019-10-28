const createError = (originalError, name, message) => {
    const error = new Error(`${message} --- Caused by: ${originalError.message}`);
    error.name = `${name} --- Caused by: ${originalError.name}`;
    error.stack = originalError.stack;
    return error;
}

module.exports = {
    failedDbConnection: (originalError) => createError(
        originalError,
        'failed-db-connection',
        'failed to connect to db'
    ),
    consumeInventoryMessage: {
        failed: (originalError, activationId) => createError(
            originalError,
            'failed-consume-inventory-message',
            `failure in run of consume inventory message for activation ID: ${activationId}`
        ),
        failedUpdateInventory: (originalError, inventoryData, existingDocument) => createError(
            originalError,
            'failed-inventory-update',
            `failed to update inventory. Document: ${existingDocument}, inventory: ${inventoryData}.`
        ),
        failedUpdateStyle: (originalError, styleId, update) => createError(
            originalError,
            'failed-style-update',
            `failed to update style. Style Id: ${styleId}, update: ${update}`
        )
    }
}
