const { priceChangeActivityTypes } = require('../../constants');

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

function findApplicablePriceChange (siteIdPriceChanges) {
  const deletedPriceChangeIds = siteIdPriceChanges.filter(priceChange => priceChange.activityType === priceChangeActivityTypes.DELETED).map(({ priceChangeId }) => priceChangeId)
  const addedPriceChanges = siteIdPriceChanges.filter(priceChange =>  [priceChangeActivityTypes.APPROVED, priceChangeActivityTypes.CREATED].includes(priceChange.activityType))
  const availablePriceChanges = addedPriceChanges.filter(({ priceChangeId }) => !deletedPriceChangeIds.includes(priceChangeId))
  const currentTime = new Date().getTime()
  const activePriceChanges = availablePriceChanges.filter(({ startDate }) => !startDate || startDate.getTime() <= currentTime)
  // technically, the second clause of the following filter condition is unncessary, but just to be on the safe side
  const promotionalPriceChange = activePriceChanges.find(({ endDate }) => endDate && endDate.getTime() >= currentTime)
  const standardPriceChange = activePriceChanges.find(({ endDate }) => !endDate)
  return promotionalPriceChange || standardPriceChange
}

// standard price change: a price change that has an start date but no end date
// promotional price change: a price change that has a start date and an end date
// original price: a price set along with the entry of the style into the catalog, has no start or end date
function findApplicablePriceChanges (parsedPriceChanges) {
  const priceChangesGroupedBySiteId = groupPriceChangesBySiteId (parsedPriceChanges)
  return Object.entries(priceChangesGroupedBySiteId).reduce((applicablePriceChanges, [siteId, priceChanges]) =>
    Object.assign(applicablePriceChanges, { [siteId]: findApplicablePriceChange(priceChanges) }),
  {})
}

module.exports = {
  findApplicablePriceChanges
}
