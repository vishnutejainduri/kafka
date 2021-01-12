const { Transform } = require('stream')
const { headers } = require('./config')
const { formatProduct } = require('./mapping')

const maybeAddHeaders = (shouldAddHeaders, lines) => {
  if (!shouldAddHeaders) return lines
  return `${headers.join(',')}\n${lines}`
}

const getFormatStream = (locale, params) => {
  const formatProductForLocale = formatProduct(locale, params)
  let isStartOfFile = true

  return new Transform({
    transform: (data, _encoding, callback) => {
      let product
      try {
        product = JSON.parse(data.toString())
      } catch (error) {
        if (data.toString() !== '') {
          callback(new Error('Data not valid JSON:', data.string()))
        }
      }
      const productLines = formatProductForLocale(product)
      callback(null, maybeAddHeaders(isStartOfFile, productLines) || '')
      isStartOfFile = false
    }
  })
}

module.exports = {
  getFormatStream
}
