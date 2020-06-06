const { priceChangeActivityTypes, siteIds } = require('../../constants');
const parseSalePriceMessage = require('../../lib/parseSalePriceMessage')
const parseStyleMessage = require('../../lib/parseStyleMessage')
const { getMostUpToDateObject } = require('../../lib/utils')

function groupPriceChangesBySiteId (parsedPriceChanges) {
  return parsedPriceChanges.reduce((groupedPriceChanges, priceChange) => {
    if (groupedPriceChanges[priceChange.siteId]) {
      groupedPriceChanges[priceChange.siteId].push(priceChange)
    } else {
      groupedPriceChanges[priceChange.siteId] = [priceChange]
    }
    return groupedPriceChanges
  }, {})
}

function getLatestPriceChanges (groupedParsedPriceChanges) {
  return Object.values(groupedParsedPriceChanges).reduce((latestPriceChanges, groupedPriceChanges) => {
    latestPriceChanges.push(getMostUpToDateObject('processDateCreated')(groupedPriceChanges))
    return latestPriceChanges
  }, [])
}

function groupPriceChangesById (parsedPriceChanges) {
  return parsedPriceChanges.reduce((groupedPriceChanges, priceChange) => {
    if (groupedPriceChanges[priceChange.priceChangeId]) {
      groupedPriceChanges[priceChange.priceChangeId].push(priceChange)
    } else {
      groupedPriceChanges[priceChange.priceChangeId] = [priceChange]
    }
    return groupedPriceChanges
  }, {})
}

function findApplicablePriceChange (siteIdPriceChanges) {
  const deletedPriceChangeIds = siteIdPriceChanges.filter(priceChange => priceChange.activityType === priceChangeActivityTypes.DELETED).map(({ priceChangeId }) => priceChangeId)
  const addedPriceChanges = siteIdPriceChanges.filter(priceChange =>  [priceChangeActivityTypes.APPROVED, priceChangeActivityTypes.CREATED].includes(priceChange.activityType))
  const availablePriceChanges = addedPriceChanges.filter(({ priceChangeId }) => !deletedPriceChangeIds.includes(priceChangeId))
  const currentTime = new Date().getTime()
  const activePriceChanges = availablePriceChanges.filter(({ startDate, endDate }) => startDate.getTime() <= currentTime && (!endDate || endDate.getTime() >= currentTime))
  const activePriceChangesGroupedById = groupPriceChangesById(activePriceChanges)
  const latestActivePriceChanges = getLatestPriceChanges(activePriceChangesGroupedById)
  if (latestActivePriceChanges.length > 1) {
    throw new Error('Cannot process overlapping price changes for the same site ID.')
  }
  return latestActivePriceChanges[0]
}

// standard price change: a price change that has an start date but no end date
// promotional price change: a price change that has a start date and an end date
// original price: a price set along with the entry of the style into the catalog, has no start or end date
/**
 * @param {PriceChange[]} parsedPriceChanges
 * @returns {{ [siteId: string]: PriceChange }}
 */
function findApplicablePriceChanges (parsedPriceChanges) {
  const priceChangesGroupedBySiteId = groupPriceChangesBySiteId (parsedPriceChanges)
  return Object.entries(priceChangesGroupedBySiteId).reduce((applicablePriceChanges, [siteId, priceChanges]) =>
    Object.assign(applicablePriceChanges, { [siteId]: findApplicablePriceChange(priceChanges) }),
  {})
}

/**
 * @param {number} originalPrice
 * @param {ApplicablePriceChanges} applicablePriceChanges
 * @returns {{ originalPrice?: number, onlinePrice?: number, inStorePrice?: number, isSale: boolean, isOnlineSale: boolean, lowestPrice?: number, lowestOnlinePrice?: number }}
 */
function getPriceInfo (originalPrice, applicablePriceChanges) {
  const {
    [siteIds.IN_STORE]: inStorePriceChange,
    [siteIds.ONLINE]: onlinePriceChange
  } = applicablePriceChanges

  const onlineSalePrice = onlinePriceChange && Number.isFinite(onlinePriceChange.newRetailPrice) ? onlinePriceChange.newRetailPrice : null
  const inStoreSalePrice = inStorePriceChange && Number.isFinite(inStorePriceChange.newRetailPrice) ? inStorePriceChange.newRetailPrice : null

  let lowestOnlinePrice
  let lowestPrice

  if (Number.isFinite(originalPrice)) {
    if (onlineSalePrice === null) {
      lowestOnlinePrice = originalPrice
    } else {
      lowestOnlinePrice = Math.min(originalPrice, onlineSalePrice)
    }
    if (lowestOnlinePrice === null) {
      lowestPrice = inStoreSalePrice
    } else {
      if (inStoreSalePrice === null) {
        lowestPrice = lowestOnlinePrice
      } else {
        lowestPrice = Math.min(inStoreSalePrice, lowestOnlinePrice)
      }
    }
  } else {
    lowestOnlinePrice = onlineSalePrice
    lowestPrice = inStoreSalePrice
  }

  return {
    originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
    onlineSalePrice,
    inStoreSalePrice,
    isSale: !!inStorePriceChange,
    isOnlineSale: !!onlinePriceChange,
    lowestOnlinePrice,
    lowestPrice: lowestPrice
  }
}

const topicStyleIdMapping = {
  [parseSalePriceMessage.topicName]: parseSalePriceMessage.styleIdKey,
  [parseStyleMessage.topicName]: parseStyleMessage.styleIdKey
}

function extractStyleId ({ topic, value }) {
  const styleId = value[topicStyleIdMapping[topic]]
  if (!styleId) {
    throw new Error(`Could not extract style ID from message for topic ${topic} with value: `, value);
  }
  return styleId
}

module.exports = {
  findApplicablePriceChanges,
  getPriceInfo,
  extractStyleId
}
