const { LOCALE_TO_PRODUCT } = require('../narvar/constantsNarvar') 

const getItemImage = (styleId) => `https://i1.adis.ws/i/harryrosen/${styleId}?$prp-4col-xl$`
const getItemUrl = (styleId, locale) => `https://harryrosen.com/${locale.substr(0,2)}/${LOCALE_TO_PRODUCT[locale]}/${styleId}`

module.exports = {
  getItemImage,
  getItemUrl
}
