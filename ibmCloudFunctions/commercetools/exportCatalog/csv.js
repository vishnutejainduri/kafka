const { Transform } = require('stream')
const { headers } = require('./config')

const formatProduct = locale => product => `${product.name[locale]},${product.id}\n`

const maybeAddHeaders = (shouldAddHeaders, lines) => {
  if (!shouldAddHeaders) return lines
  return `${headers.join(',')}\n${lines}`
}

const getFormatStream = locale => {
  const formatProductForLocale = formatProduct(locale)
  let isStartOfFile = true

  return new Transform({
    transform: (data, _encoding, callback) => {
      let product
      try {
        product = JSON.parse(data.toString())
      } catch (error) {
        if (data.toString() !== '') {
          const error = new Error('Data not valid JSON:', data.string())
          console.error(error.message)
          callback(error)
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
