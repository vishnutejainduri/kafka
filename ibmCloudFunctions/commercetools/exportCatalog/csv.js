const { Transform } = require('stream')
const { parse } = require('json2csv')
const { csvHeaders } = require('./config')
const { getFormattedVariantsFromProduct } = require('./mapping')

const maybeAddHeaders = (shouldAddHeaders, lines) => {
  if (!shouldAddHeaders) return lines
  return `${parse([], { fields: csvHeaders })}\n${lines}`
}

const getLinesFromFormattedVariants = formattedVariants => {
  return `${parse(formattedVariants, { header: false, fields: csvHeaders })}\n`
}

const getFormatStream = (locale, params) => {
  const getFormattedVariantsFromProductForLocale = getFormattedVariantsFromProduct(locale, params)
  let isStartOfFile = true

  return new Transform({
    transform: (data, _encoding, callback) => {
      let product
      try {
        product = JSON.parse(data.toString())
      } catch (error) {
        if (data.toString() !== '') {
          callback(new Error('Data not valid JSON:', data.string()))
          return
        }
      }
      const formattedVariants = getFormattedVariantsFromProductForLocale(product)
      const productLines = getLinesFromFormattedVariants(formattedVariants)
      callback(null, maybeAddHeaders(isStartOfFile, productLines) || '')
      isStartOfFile = false
    }
  })
}

module.exports = {
  getFormatStream
}
