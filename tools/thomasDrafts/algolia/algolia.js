require('dotenv').config()
const algoliasearch = require('algoliasearch')
const client = algoliasearch(process.env.ALGOLIA_API_CLIENT, process.env.ALGOLIA_API_KEY);
const index = client.initIndex(process.env.ALGOLIA_INDEX);

const removePromoStickerFromStylesByStyleId = styleIds => {
  const updateObjects = styleIds.map(styleId => ({
    promotionalSticker: { en: null, fr: null },
    objectID: styleId
  }))
  return index.partialUpdateObjects(updateObjects)
}
