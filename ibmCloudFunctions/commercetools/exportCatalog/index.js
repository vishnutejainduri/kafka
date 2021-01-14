const fs = require('fs')
const { Transform } = require('stream')
const { languageKeys } = require('../constantsCt')
const { getProductExporter } = require('./commercetools')
const { getFormatStream } = require('./csv')

const splitStream = new Transform({
  transform: (data, _encoding, callback) => callback(null, data)
})

const main = async params => {
  const productExporter = await getProductExporter(params)
  const writeStreamEnglish = fs.createWriteStream('./harryrosen-en.csv')
  const writeStreamFrench = fs.createWriteStream('./harryrosen-fr.csv')
  const formatStreamEnglish = getFormatStream(languageKeys.ENGLISH, params)
  const formatStreamFrench = getFormatStream(languageKeys.FRENCH, params)

  formatStreamEnglish.pipe(writeStreamEnglish)
  formatStreamFrench.pipe(writeStreamFrench)
  splitStream.pipe(formatStreamEnglish)
  splitStream.pipe(formatStreamFrench)

  productExporter.run(splitStream)
}

module.exports = main
