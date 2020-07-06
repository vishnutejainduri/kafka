'use strict';
const createError = require('./createError');
const { siteIds } = require('../constants');

const TOPIC_NAME = 'sale-prices-connect-jdbc';
const styleIdKey = 'STYLE_ID';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    [styleIdKey]: 'styleId',
    PRICE_CHANGE_ID: 'priceChangeId',
    START_DATE: 'startDate',
    END_DATE: 'endDate',
    ACTIVITY_TYPE: 'activityType',
    PROCESS_DATE_CREATED: 'processDateCreated',
    NEW_RETAIL_PRICE: 'newRetailPrice',
    SITE_ID: 'siteId'
};

function validateSalePriceMessages(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Sale Price update messages');
    }
    return msg
}

function passOnlinePriceMessages(msg) {
    // we receive messages for multiple side IDs, but only want to process messages for online store i.e. SITE_ID === '00990'
    return msg.value.SITE_ID !== siteIds.ONLINE
        ? null
        : msg
}

function passPermanentMarkdownPrices(msg) {
    // any price message with a null end date is a 'permanent markdown', and is handled differently then any other price (we exclude them in this CF)
    return !msg.value.END_DATE
        ? null
        : msg
}

// Parse a message from the MERCH.IRO_POS_PRICES table and return a new object with filtered and re-mapped attributes.
function parseSalePriceMessage(msg) {
    // Re-map attributes
    const priceData = {};
    for (let sourceAttributeName in attributeMap) {
        priceData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    if (!priceData.styleId) {
        throw createError.parsePriceMessage.noStyleId()
    }

    if (priceData.endDate) {
        // Jesta forces a time of 00:00 for all dates
        // So when HR people set an end date of May 28, Jesta converts it to May 28 at 00:00
        // Therefore, you loose 24hr for the sale price validity because it's supposed to be May 28 at 23:59 (inclusive range)
        priceData.endDate += 86400000;
        priceData.endDate = new Date(priceData.endDate)
    }

    priceData.startDate = new Date(priceData.startDate)

    priceData.id = priceData.styleId;
    priceData.priceChangeId = priceData.priceChangeId.toString();
    priceData.processDateCreated = new Date(priceData.processDateCreated);
    priceData.isOriginalPrice = false;

    return priceData;
}

module.exports = {
    topicName: TOPIC_NAME,
    styleIdKey,
    parseSalePriceMessage,
    validateSalePriceMessages,
    passOnlinePriceMessages,
    passPermanentMarkdownPrices
};
