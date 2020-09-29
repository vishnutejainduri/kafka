const { isStaged } = require('../../commercetools/constantsCt')
const { addErrorHandling } = require('../utils')

// Note: All SKUs must have the same style
const getAtsUpdateActionsFromAtsBySku = atsBySku =>
  atsBySku.map(({ skuId, onlineAts }) => ({
    action: 'setAttribute',
    sku: skuId,
    name: 'hasOnlineAts',
    value: onlineAts > 0,
    staged: isStaged
  }))

const updateSkuAtsForSingleCtProduct = ctHelpers => async atsBySku => {
  const { client, requestBuilder } = ctHelpers

  const atsUpdateActions = getAtsUpdateActionsFromAtsBySku(atsBySku)
  const styleId = atsBySku[0].styleId
  const uri = requestBuilder.products.byKey(styleId).build();
  const currentCtProduct = (await client.execute({ method: 'GET', uri })).body

  const body = JSON.stringify({
    version: currentCtProduct.version,
    actions: atsUpdateActions
  })

  return client.execute({
    body,
    method: 'POST',
    uri
  })
}

const updateSkuAtsForManyCtProductsByBatchedSkuAts = (skuAtsBatchedByStyleId, ctHelpers) =>
  Promise.all(skuAtsBatchedByStyleId.map(addErrorHandling(updateSkuAtsForSingleCtProduct(ctHelpers))))

module.exports = {
  getAtsUpdateActionsFromAtsBySku,
  updateSkuAtsForManyCtProductsByBatchedSkuAts,
  updateSkuAtsForSingleCtProduct
}