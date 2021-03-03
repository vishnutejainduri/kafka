require('dotenv').config()
const fetch = require('node-fetch')
const { createClient } = require('@commercetools/sdk-client')
const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth')
const { createRequestBuilder } = require('@commercetools/api-request-builder')
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http')
const { sleep } = require('./utils')

const projectKey = process.env.CTP_PROJECT_KEY
const authHost = process.env.CTP_AUTH_URL
const clientId = process.env.CTP_CLIENT_ID
const apiHost = process.env.CTP_API_URL
const clientSecret = process.env.CTP_CLIENT_SECRET

const requestBuilder = createRequestBuilder({ projectKey })

const client = createClient({
  middlewares: [
    createAuthMiddlewareForClientCredentialsFlow({
      host: authHost,
      projectKey,
      credentials: {
        clientId,
        clientSecret,
      },
      scopes: process.env.CTP_SCOPES.split(' '),
      fetch
    }),
    createHttpMiddleware({
      host: apiHost,
      includeResponseHeaders: false,
      includeOriginalRequest: false,
      maskSensitiveHeaderData: false,
      enableRetry: false,
      fetch
    })
  ]
})

const getSkuFromStyle = (style, skuId) => style.variants.find(variant => variant.sku === skuId)

const getStyleByBarcode = async barcode => {
  const { styleId } = barcode.value
  return (await client.execute({
    method: 'GET',
    uri: requestBuilder.productProjections.byKey(styleId).build()
  })).body
}

const getSkuAttributeValue = (sku, attributeName) => {
  const attribute = sku.attributes.find(attribute => attribute.name == attributeName)
  if (!attribute) return undefined
  return attribute.value
}

const setSkuBarcodeReferences = ({ style, skuId, barcodeReferences }) =>
  client.execute({
    method: 'POST',
    uri: requestBuilder.products.byKey(style.key).build(),
    body: {
      version: style.version,
      actions: [
        {
          action: 'setAttribute',
          sku: skuId,
          name: 'barcodes',
          value: barcodeReferences,
          staged: false
        }
      ]
    }
  })

const removeBarcodeReferenceFromItsSku = async barcode => {
  const style = await getStyleByBarcode(barcode)
  const sku = getSkuFromStyle(style, barcode.value.skuId)
  const currentSkuBarcodeReferences = getSkuAttributeValue(sku, 'barcodes')
  const newBarcodeReferences = currentSkuBarcodeReferences.filter(reference => reference.id !== barcode.id)
  return setSkuBarcodeReferences({ style, skuId: barcode.value.skuId, barcodeReferences: newBarcodeReferences })
}

const deleteBarcode = async barcode =>
  client.execute({
    uri: requestBuilder.customObjects.byContainerAndKey('barcodes', barcode.key).withVersion(barcode.version).build(),
    method: 'DELETE'
  })

const removeBarcodeReferenceFromItsSkuAndDeleteBarcode = async barcode => {
  await removeBarcodeReferenceFromItsSku(barcode)
  console.log(`barcode ${barcode.value.barcode} reference removed from SKU ${barcode.value.skuId} (style: ${barcode.value.styleId})`)
  await deleteBarcode(barcode)
  console.log(`barcode ${barcode.value.barcode} deleted`)
}

const getBarcodeObjectFromBarcodeNumber = async barcodeNumber =>
  (await client.execute({
      uri: requestBuilder.customObjects.byContainerAndKey('barcodes', barcodeNumber).build(),
      method: 'GET'
  })).body


// Use this instead of `Promise.all(barcodeNumbers.map(getBarcodeObjectFromBarcodeNumber))`
// to avoid getting rate limited by CT.
// This could probably be done much more efficiently using CT queries.
const getBarcodeObjectsFromBarcodeNumbers = async barcodeNumbers => {
  const barcodeObjects = []
  for (const barcodeNumber of barcodeNumbers) {
    try {
      barcodeObjects.push(await getBarcodeObjectFromBarcodeNumber(barcodeNumber))
    } catch (error)  {
      console.warn(`Could not get barcode ${barcodeNumber}`)
    }
    await sleep(50)
  }
  return barcodeObjects
}

const getStyleByStyleId = async styleId =>
  (await client.execute({
    uri: requestBuilder.productProjections.byKey(styleId).build(),
    method: 'GET'
  })).body

const removePromoStickerFromStyleByStyleId = async styleId => {
  const style = await getStyleByStyleId(styleId)

  return client.execute({
    uri: requestBuilder.products.byKey(styleId).build(),
    method: 'POST',
    body: JSON.stringify({
      version: style.version,
      actions: [{
        action: 'setAttributeInAllVariants',
        name: 'promotionalSticker',
        staged: false
      }]
    })
  })
}

const removePromoStickerFromStylesByStyleId = async styleIds => {
  for (const styleId of styleIds) {
    try {
      await removePromoStickerFromStyleByStyleId(styleId)
      console.log(`Removed promo sticker from style ${styleId}`)
    }
    catch (error) {
      console.error(`Unable to remove promo sticker from ${styleId}: ${error.message}`)
    }
  }
  return true
}

module.exports = {
  getBarcodeObjectsFromBarcodeNumbers,
  removeBarcodeReferenceFromItsSkuAndDeleteBarcode,
}
