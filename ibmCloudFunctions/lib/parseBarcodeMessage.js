'use strict';

const { safeGetDate } = require("./utils");

const TOPIC_NAME = 'barcodes-connect-jdbc';

const attributeMap = {
  'LASTMODIFIEDDATE': 'lastModifiedDate',
  'BARCODE': 'barcode',
  'SUBTYPE': 'subType',
  'SKU_ID': 'skuId',
  'STYLEID': 'styleId'
}

function filterBarcodeMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse barcode update messages');
    }

    return msg.value.FKORGANIZATIONNO === '1';
}

function parseBarcodeMessage(msg) {
    const barcodeData = {};
    for (let sourceAttributeName in attributeMap) {
        barcodeData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    barcodeData.effectiveAt = safeGetDate(msg.value.EFFECTIVEDATETIME, null)
    barcodeData.expiresAt = safeGetDate(msg.value.EXPIRYDATETIME, null)
    barcodeData._id = barcodeData.barcode;

    return barcodeData;
}

module.exports = {
    filterBarcodeMessage,
    parseBarcodeMessage
};
