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

const updateSkuAtsForSingleCtProduct = ctHelpers => async styleAts => {
  const { client, requestBuilder } = ctHelpers
  
  if(!styleAts || !styleAts.skus || styleAts.skus.length === 0) {
    return null;
  }
  
  const atsUpdateActions = getAtsUpdateActionsFromAtsBySku(styleAts.skus)
  
  const uri = requestBuilder.products.byKey(styleAts.styleId).build();
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
  return { styleId: styleAts.styleId, ok: true }
}

const updateSkuAtsForManyCtProductsBatchedByStyleId = (skuAtsBatchedByStyleId, ctHelpers) => 
  Promise.all(skuAtsBatchedByStyleId.map(addErrorHandling(updateSkuAtsForSingleCtProduct(ctHelpers))))

module.exports = {
  getAtsUpdateActionsFromAtsBySku,
  updateSkuAtsForManyCtProductsBatchedByStyleId,
  updateSkuAtsForSingleCtProduct
}
