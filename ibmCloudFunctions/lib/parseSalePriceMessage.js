'use strict';
const createError = require('./createError');

const TOPIC_NAME = 'sale-prices-connect-jdbc';

const ACTIVITY_TYPES = ['A', 'C', 'D'];

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    STYLE_ID: 'styleId',
    PRICE_CHANGE_ID: 'priceChangeId',
    START_DATE: 'startDate',
    END_DATE: 'endDate',
    ACTIVITY_TYPE: 'activityType',
    PROCESS_DATE_CREATED: 'processDateCreated',
    NEW_RETAIL_PRICE: 'newRetailPrice'
};

function filterPriceMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Sale Price update messages');
    }

    return ACTIVITY_TYPES.includes(msg.value.ACTIVITY_TYPE);
}

// Parse a message from the MERCH.IRO_POS_PRICES table and return a new object with filtered and re-mapped attributes.
function parsePriceMessage(msg) {
    // Re-map attributes
    const priceData = {};
    for (let sourceAttributeName in attributeMap) {
        priceData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    if (!priceData.styleId) {
        throw createError.parsePriceMessage.noStyleId()
    }

    priceData._id = priceData.styleId;

    return priceData;
}

module.exports = {
    parsePriceMessage,
    filterPriceMessages
};
