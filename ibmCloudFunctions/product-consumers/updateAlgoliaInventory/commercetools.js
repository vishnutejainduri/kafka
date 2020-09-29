const { isStaged } = require('../../commercetools/constantsCt')

// Note: All SKUs must have the same style
const getAtsUpdateActionsFromAtsBySku = atsBySku =>
  atsBySku.map(({ skuId, onlineAts }) => ({
    action: 'setAttribute',
    sku: skuId,
    name: 'hasOnlineAts',
    value: onlineAts > 0,
    staged: isStaged
  }))

const updateSkuAtsForSingleCtProduct = async (atsBySku, ctHelpers) => {
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

module.exports = {
  getAtsUpdateActionsFromAtsBySku,
  updateSkuAtsForSingleCtProduct
}