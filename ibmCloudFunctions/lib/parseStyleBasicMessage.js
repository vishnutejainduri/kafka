'use strict';

const TOPIC_NAME = 'styles-basic-connect-jdbc';

function parseStyleBasicMessage(msg) {
    const validBrandIds = ["1", "2", "3"];
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Style Basic update messages');
    }
    if (validBrandIds.indexOf(msg.value.BRAND_ID) <= -1) {
        throw new Error('Invalid brand id in message');
    }


    return {
        _id: msg.value.STYLE_ID,
        id: msg.value.STYLE_ID,
        isOutlet: msg.value.BRAND_ID === "1" ? false : true,
        lastModifiedDate: msg.value.LAST_MODIFIED_DATE
    };
}

module.exports = {
    parseStyleBasicMessage
};
