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
  if(!atsBySku[0]) {
    return null;
  }
  const atsUpdateActions = getAtsUpdateActionsFromAtsBySku(atsBySku)
  const styleId = atsBySku[0].styleId
  const uri = requestBuilder.products.byKey(styleId).build();
  const currentCtProduct = (await client.execute({ method: 'GET', uri })).body

  const body = JSON.stringify({
    version: currentCtProduct.version,
    actions: atsUpdateActions
  })

  await client.execute({
    body,
    method: 'POST',
    uri
  })
  return { styleId, ok: true }
}

const updateSkuAtsForManyCtProductsBatchedByStyleId = (skuAtsBatchedByStyleId, ctHelpers) => 
  Promise.all(skuAtsBatchedByStyleId.map(addErrorHandling(updateSkuAtsForSingleCtProduct(ctHelpers))))

  
module.exports = {
  getAtsUpdateActionsFromAtsBySku,
  updateSkuAtsForManyCtProductsBatchedByStyleId,
  updateSkuAtsForSingleCtProduct
}
