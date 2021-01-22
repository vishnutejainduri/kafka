const { getFormatStream } = require('./csv')
const { getFtpClient, pipeStreamToServer } = require('./ftp')
const { outputFilenames } = require('./config')
const { getProductExporter } = require('./commercetools')

const main = async params => {
  const ftpClient = await getFtpClient(params)
  const productExporter = await getProductExporter(params)
  const locale = params.locale
  const stream = getFormatStream(locale, params)
  const outputFilename = outputFilenames[locale]
  
  productExporter.run(stream)
  console.log(`Starting to process ${outputFilename} (${locale})`)
  try {
    await pipeStreamToServer({ ftpClient, readStream: stream, outputFilename })
    console.log(`Successfully uploaded ${outputFilename}`)
  } catch (error) {
    console.error(`Unable to upload ${outputFilename}:`, error.message)
  } finally {
    ftpClient.end()
  }
}

global.main = main

module.exports = global.main
