'use strict';

const TOPIC_NAME = 'thresholds-connect-jdbc';

function parseThresholdMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Threshold update messages');
    }

    return {
        skuId: msg.value.SKU_ID,
        threshold: msg.value.THRESHOLD
    };
}

module.exports = {
    parseThresholdMessage
};
