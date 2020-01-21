'use strict';
const createError = require('./createError');

const TOPIC_NAME = 'prices-connect-jdbc';

const ONLINE_SITE_ID = '00990';
const IN_STORE_SITE_ID = '00011';

// Map of source attribute names to mapped name. Non-translatable attribute names
const attributeMap = {
    STYLE_ID: 'styleId',
    SITE_ID: 'siteId',
    NEW_RETAIL_PRICE: 'newRetailPrice'
};

const calcDiscount = (originalPrice, salePrice) => {
    // If the sales price is null or 0 there is no discount.
    // If the original price is null or 0, we cannot calculate the discount.
    // If both prices are equal there is no discount.
    // In all cases we represent the discount as 0.
    if (!salePrice || !originalPrice || salePrice === originalPrice) {
        return 0
    }

    const discount = Math.round(((1 - salePrice/originalPrice) * 100));
    return Number.isNaN(discount) ? 0 : discount;
}

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

    if (!priceData.styleId) {
        throw createError.parsePriceMessage.noStyleId()
    }

    priceData._id = priceData.styleId;

    return priceData;
}

function generateUpdateFromParsedMessage(update, priceData, styleData) {
    const updateToProcess = {};
    let onlineSalePrice = priceData ? priceData.onlineSalePrice : null;
    let inStoreSalePrice = priceData ? priceData.inStoreSalePrice : null;

    switch (update.siteId) {
        case ONLINE_SITE_ID:
            updateToProcess.onlineSalePrice = update.newRetailPrice;
            onlineSalePrice = updateToProcess.onlineSalePrice;
            break;
        case IN_STORE_SITE_ID:
            updateToProcess.inStoreSalePrice = update.newRetailPrice;
            inStoreSalePrice = updateToProcess.inStoreSalePrice;
            break;
        default:
            break;
    }


    updateToProcess.currentPrice = onlineSalePrice || styleData.originalPrice;
    updateToProcess.lowestOnlinePrice = updateToProcess.currentPrice > styleData.originalPrice
                             ? styleData.originalPrice
                             : updateToProcess.currentPrice

    updateToProcess.lowestPrice = inStoreSalePrice 
                             ? Math.min(updateToProcess.lowestOnlinePrice, inStoreSalePrice)
                             : updateToProcess.lowestOnlinePrice

    updateToProcess.isSale = !!(onlineSalePrice || inStoreSalePrice);
    updateToProcess.isOnlineSale = !!(onlineSalePrice);

    updateToProcess.inStoreDiscount = calcDiscount(styleData.originalPrice, inStoreSalePrice);
    updateToProcess.onlineDiscount = calcDiscount(styleData.originalPrice, onlineSalePrice);

    return updateToProcess;
}

module.exports = {
    parsePriceMessage,
    filterPriceMessages,
    generateUpdateFromParsedMessage
};
