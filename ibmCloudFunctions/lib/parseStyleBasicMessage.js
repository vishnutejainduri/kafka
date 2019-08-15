'use strict';

const TOPIC_NAME = 'styles-basic-connect-jdbc';

function parseStyleBasicMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Style Basic update messages');
    }

    return {
        _id: msg.value.STYLE_ID,
        id: msg.value.STYLE_ID,
        isOutlet: msg.value.BRAND_ID === "1" ? false : true,
        lastModifiedDate: msg.value.LAST_MODIFIED_DATE
    };
}

function filterStyleBasicMessage(msg) {
    const validBrandIds = ["1", "2", "3"];
    return validBrandIds.indexOf(msg.value.BRAND_ID) > -1;
}

module.exports = {
    parseStyleBasicMessage,
    filterStyleBasicMessage
};
