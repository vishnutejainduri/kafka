'use strict';

const TOPIC_NAME = 'styles-basic-connect-jdbc';

function parseStyleBasicMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Style Basic update messages');
    }

    const brandId = msg.value.BRAND_ID;

    return {
        _id: msg.value.STYLE_ID,
        id: msg.value.STYLE_ID,
        brandId,
        isOutlet: brandId !== null && brandId !== '1',
        lastModifiedDate: msg.value.LAST_MODIFIED_DATE
    };
}

module.exports = {
    parseStyleBasicMessage
};
