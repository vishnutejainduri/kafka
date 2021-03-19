const createError = require('../../lib/createError');
const { priceChangeProcessStatus } = require('../constants')
const { clearancePromotionalSticker, blankPromotionalSticker } = require('../../lib/parseStyleMessage')

const updateOriginalPrice = (prices, styleData) => prices.updateOne({ _id: styleData._id }, { $currentDate: { lastModifiedInternalOriginalPrice: { $type:"timestamp" } }, $set: { _id: styleData._id, styleId: styleData._id, originalPrice: styleData.originalPrice } }, { upsert: true }).catch(originalError => {
    throw createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData);
})
const updateOriginalPriceProcessedFlag = (prices, styleData) => prices.updateOne({ _id: styleData._id, 'priceChanges.originalPriceProcessed': { $exists: true } }, { $set: { 'priceChanges.$.originalPriceProcessed': priceChangeProcessStatus.false } }).catch(originalError => {
    throw createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData);
})
const updateOriginalPriceProcessedFlagCT = (prices, styleData) => prices.updateOne({ _id: styleData._id, 'priceChanges.originalPriceProcessedCT': { $exists: true } }, { $set: { 'priceChanges.$.originalPriceProcessedCT': priceChangeProcessStatus.false } }).catch(originalError => {
    throw createError.consumeCatalogMessage.failedPriceUpdates(originalError, styleData);
})

const addStyleToBulkATSQueue = (bulkAtsRecalculateQueue, styleData) => bulkAtsRecalculateQueue.insertOne({ _id: styleData._id, insertTimestamp: styleData.effectiveDate }).catch(originalError => {
    throw createError.consumeCatalogMessage.failedBulkAtsInsert(originalError, styleData);
})

const upsertStyle = (styles, styleData, shouldInsert) => {
  const optionsQuery = {}
  const updateQuery = {
    "$set": styleData
  }

  if (shouldInsert) {
    optionsQuery['upsert'] = true
  } else {
    updateQuery['$currentDate'] = { lastModifiedInternal: { $type:"timestamp" } }
  }

  return styles.updateOne({ _id: styleData._id }, updateQuery, optionsQuery)
  .catch(originalError => {
      throw createError.consumeCatalogMessage.failedStyleUpdates(originalError, styleData);
  })
}

const hasDepertmentIdChangedFrom27 = (existingStyleData, newStyleData) => existingStyleData.departmentId !== newStyleData.departmentId && (newStyleData.departmentId === '27' || existingStyleData.departmentId === '27')

const shouldRemovePromoStickerFromStyle = ({ oldStyle, newStyle }) =>
  newStyle.isReturnable &&
  Boolean(oldStyle && oldStyle.promotionalSticker && oldStyle.promotionalSticker.en === clearancePromotionalSticker.en)

const removePromoStickerFromStyleIfNecessary = ({ oldStyle, newStyle }) => {
  if (!shouldRemovePromoStickerFromStyle({ oldStyle, newStyle })) return newStyle
  return {
    ...newStyle,
    promotionalSticker: blankPromotionalSticker
  }
}

module.exports = {
  updateOriginalPrice,
  updateOriginalPriceProcessedFlag,
  updateOriginalPriceProcessedFlagCT,
  upsertStyle,
  hasDepertmentIdChangedFrom27,
  addStyleToBulkATSQueue,
  shouldRemovePromoStickerFromStyle,
  removePromoStickerFromStyleIfNecessary
}
