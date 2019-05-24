'use strict';

const TOPIC_NAME = 'prices-connect-jdbc';

const ONLINE_SITE_ID = '00990';
const IN_STORE_SITE_ID = '00011';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    STYLE_ID: 'styleId',
    SITE_ID: 'siteId',
    NEW_RETAIL_PRICE: 'newRetailPrice'
};

const transforms = {
    styleId: (styleId) => styleId + '-00'
};

function filterPriceMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Price update messages');
    }

    return true;
}

// Parse a message from the MERCH.IRO_POS_PRICES table and return a new object with filtered and re-mapped attributes.
function parsePriceMessage(msg) {
    // Re-map attributes
    const priceData = {};
    for (let sourceAttributeName in attributeMap) {
        priceData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    for (let transformField in transforms) {
        priceData[transformField] = transforms[transformField](priceData[transformField]);
    }

    return priceData;
}

module.exports = {
    parsePriceMessage,
    filterPriceMessages,
    IN_STORE_SITE_ID,
    ONLINE_SITE_ID
};
