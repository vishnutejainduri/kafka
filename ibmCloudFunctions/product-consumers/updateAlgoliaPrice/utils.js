const { priceChangeActivityTypes, siteIds } = require('../../constants')
const { priceChangeProcessStatus } = require('../constants')
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

function findCurrentPriceFromOverlappingPrices (overlappingPrices) {
  let currentPrice;
  for (let overlappingPrice of overlappingPrices) {
    if (currentPrice) {
      if (!currentPrice.endDate && !overlappingPrice.endDate) {
        // both overlapping prices are permanent markdowns, pick the one with the most recent process date created
        if ((!currentPrice.processDateCreated || !overlappingPrice.processDateCreated) ||
          currentPrice.processDateCreated.getTime() === overlappingPrice.processDateCreated.getTime()) {
          // if two permanent markdowns activate at the exact same time we can't decide which one to pick, results in unfixable overlap
          console.error(`Unfixable price overlap: Two permanent markdowns overlap. StyleId: ${currentPrice.id}, Price Change ID: ${currentPrice.priceChangeId} overlaps with Price Change ID: ${overlappingPrice.priceChangeId}`);
          currentPrice = null;
          break;
        }
        currentPrice = currentPrice.processDateCreated > overlappingPrice.processDateCreated ? currentPrice : overlappingPrice 
      } else if (!currentPrice.endDate && overlappingPrice.endDate) {
        // one of the overlapping prices is a permanent markdown the other is temporary, always pick temporary over permanent
        currentPrice = overlappingPrice;
      } else if (currentPrice.endDate && !overlappingPrice.endDate) {
        // current price is temporary, new one to check is permanent, do nothing as we should always use temporary as current
        continue;  
      } else {
        // unfixable overlap between two temporary prices
        console.error(`Unfixable price overlap: Two temporary markdowns overlap. StyleId: ${currentPrice.id}, Price Change ID: ${currentPrice.priceChangeId} overlaps with Price Change ID: ${overlappingPrice.priceChangeId}`);
        currentPrice = null;
        break;
      }
    } else {
      currentPrice = overlappingPrice;
    }
  }

  return currentPrice;
}

function getActivePriceChanges (availablePriceChanges, currentTime) {
  const activePriceChanges = [];

  availablePriceChanges.forEach((availablePriceChange) => {
    if (availablePriceChange.startDate.getTime() <= currentTime && (!availablePriceChange.endDate || availablePriceChange.endDate.getTime() >= currentTime)) {
      activePriceChanges.push(availablePriceChange);
    }

    for (let availablePriceChangeToCompare of availablePriceChanges) {
      if (!availablePriceChangeToCompare || !availablePriceChange.endDate || availablePriceChange.priceChangeId === availablePriceChangeToCompare.priceChangeId) continue;

      if (
        (availablePriceChange.startDate.getTime() >= availablePriceChangeToCompare.startDate.getTime() && availablePriceChange.endDate.getTime() <= availablePriceChangeToCompare.endDate.getTime()) //one price within another price
        || (availablePriceChange.startDate.getTime() <= availablePriceChangeToCompare.startDate.getTime() && availablePriceChange.endDate.getTime() >= availablePriceChangeToCompare.startDate.getTime()) //one price overlaps via start date (in the past but ends within another)
        || (availablePriceChange.endDate.getTime() >= availablePriceChangeToCompare.endDate.getTime() && availablePriceChange.startDate.getTime() <= availablePriceChangeToCompare.endDate.getTime()) //one price overlaps via end date (in the future but starts within another)
        ) { 
          // unfixable overlap between two temporary prices
          console.error(`Unfixable price overlap: Two temporary markdowns overlap. StyleId: ${availablePriceChange.id}, Price Change ID: ${availablePriceChange.priceChangeId} overlaps with Price Change ID: ${availablePriceChangeToCompare.priceChangeId}`);
          throw new Error(`Cannot process overlapping price changes for the same site ID for price changes: StyleId: ${availablePriceChange.id}, Price Change ID: ${availablePriceChange.priceChangeId} overlaps with Price Change ID: ${availablePriceChangeToCompare.priceChangeId}`);
      }
    }
  });
  
  return activePriceChanges;
}

function findApplicablePriceChange (siteIdPriceChanges) {
  const addedPriceChanges = siteIdPriceChanges.filter(priceChange =>  [priceChangeActivityTypes.APPROVED, priceChangeActivityTypes.CREATED].includes(priceChange.activityType))
  const deletedPriceChanges = siteIdPriceChanges.filter(priceChange => priceChange.activityType === priceChangeActivityTypes.DELETED)
  const availablePriceChanges = addedPriceChanges.filter(({ priceChangeId, processDateCreated }) => !deletedPriceChanges.find(deletedPriceChange => (deletedPriceChange.priceChangeId === priceChangeId && deletedPriceChange.processDateCreated >= processDateCreated)))
  const currentTime = new Date().getTime()
  console.log('availablePriceChanges', availablePriceChanges);
  //const activePriceChanges = availablePriceChanges.filter(({ startDate, endDate }) => startDate.getTime() <= currentTime && (!endDate || endDate.getTime() >= currentTime))
  const activePriceChanges = getActivePriceChanges (availablePriceChanges, currentTime);
  console.log('activePriceChanges', activePriceChanges);
  const activePriceChangesGroupedById = groupPriceChangesById(activePriceChanges)
  const latestActivePriceChanges = getLatestPriceChanges(activePriceChangesGroupedById)
  let latestActivePriceChange = latestActivePriceChanges[0];
  if (latestActivePriceChanges.length > 1) {
    latestActivePriceChange = findCurrentPriceFromOverlappingPrices(latestActivePriceChanges);
    if (!latestActivePriceChange) {
      throw new Error(`Cannot process overlapping price changes for the same site ID for price changes: ${siteIdPriceChanges.map(({ priceChangeId }) => priceChangeId)}`)
    }
  }
  console.log('latestActivePriceChange', latestActivePriceChange);
  return latestActivePriceChange;
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

async function findUnprocessedStyleIds (pricesCollection, processingDate, searchKey = '') {
  const documents = await pricesCollection.find({
    priceChanges: {
        $elemMatch: {
            $or: [{
                $and: [{
                    startDate: {
                        $lt: processingDate
                    },
                    [`startDateProcessed${searchKey}`]: priceChangeProcessStatus.false
                }]
            }, {
                $and: [{
                    endDate: {
                        $lt: processingDate
                    }
                }, {
                    [`endDateProcessed${searchKey}`]: priceChangeProcessStatus.false
                }]
            }]
        }
    }
  })
    .project({
      styleId: 1
    })
    // The limit is found experimentally; this is the number of messages that we can process in roughly one minute
    // One minute, because this function is called periodically every one minute.
    // It is possible that we double process the same price changes twice using these method,
    // but since the price updates are time stamp based, the effect on Algolia operations should be minimal unless we do a massive resync of all of the data
    // TODO Set the status of the messages are currently being processed to 'processing' immediately after fetching them so we can skip processing those
    // The difficulty would be handling messages that were put into 'processing' status but never finished because of a failure; will just complicate the 'findUnprocessedStyleIds' function
    .limit(1000)
    .toArray()
  return documents.map(({ styleId }) => styleId)
}

function updateChangesQuery ({ isEndDate, isFailure, processingDate, styleIds }, processFlagKey) {
  // processFlagKey can be either '' for algolia updates, or 'CT' for commercetools related pricing updates
  return [
    {
      styleId: { $in: styleIds },
      [`priceChanges.${isEndDate ? 'endDate' : 'startDate'}`]: { $lt: processingDate }
    },
    {
      $set: { [`priceChanges.$[elem].${isEndDate ? `endDateProcessed${processFlagKey}` : `startDateProcessed${processFlagKey}`}`]: isFailure ? priceChangeProcessStatus.failure : priceChangeProcessStatus.true }
    },
    {
      multi: true,
      arrayFilters: [ { [`elem.${isEndDate ? 'endDate' : 'startDate'}`]: { $lt: processingDate } } ]
    }
  ]
}

async function markProcessedChanges (pricesCollection, processingDate, processedStyleIds, processFlagKey = '') {
  const isFailure = false
  return Promise.all([
    pricesCollection.update(...updateChangesQuery({ isEndDate: false, isFailure, processingDate, styleIds: processedStyleIds }, processFlagKey)),
    pricesCollection.update(...updateChangesQuery({ isEndDate: true, isFailure, processingDate, styleIds: processedStyleIds }, processFlagKey))
  ])
}

async function markFailedChanges (pricesCollection, processingDate, failedStyleIds, processFlagKey = '') {
  const isFailure = true
  return Promise.all([
    pricesCollection.update(...updateChangesQuery({ isEndDate: false, isFailure, processingDate, styleIds: failedStyleIds }, processFlagKey)),
    pricesCollection.update(...updateChangesQuery({ isEndDate: true, isFailure, processingDate, styleIds: failedStyleIds }, processFlagKey))
  ])
}

module.exports = {
  findApplicablePriceChanges,
  getPriceInfo,
  extractStyleId,
  findUnprocessedStyleIds,
  markProcessedChanges,
  markFailedChanges
}
