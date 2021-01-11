/**
 * Finds all prices where a deletion update was sent after a creation update
 * for the same price change ID.
 */

db.prices.find({ $where: function () {
  if (!obj.priceChanges) return false
  const priceChangesGroupedById = {}
  obj.priceChanges.forEach(priceChange => {
    if (priceChangesGroupedById[priceChange.priceChangeId]) {
      priceChangesGroupedById[priceChange.priceChangeId].push(priceChange)
    } else {
      priceChangesGroupedById[priceChange.priceChangeId] = [priceChange]
    }
  })

  return Object.values(priceChangesGroupedById).some(priceChangeGroup => {
    return priceChangeGroup.some(priceChange => {
      if (priceChange.activityType !== 'D') return false
      const deletePriceChange = priceChange
      return priceChangeGroup.some(otherPriceChange => {
        if (otherPriceChange.activityType !== 'C') return false
        const createPriceChange = otherPriceChange
        return createPriceChange.processDateCreated > deletePriceChange.processDateCreated
      })
    })
  })
} }, { _id: 0, styleId: 1, priceChanges: 1 }).forEach(function(f){print(JSON.stringify(f)+',');});
