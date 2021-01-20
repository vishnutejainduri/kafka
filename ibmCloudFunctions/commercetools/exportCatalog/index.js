const { languageKeys } = require('../constantsCt')
const { getFormatStream } = require('./csv')
const { getFtpClient, pipeStreamToServer } = require('./ftp')
const { outputFilenames } = require('./config')
const { getProductExporter } = require('./commercetools')

const main = async params => {
  const ftpClient = await getFtpClient(params)
  const productExporter = await getProductExporter(params)
  const errors = []
  
  const englishConfig = {
    stream: getFormatStream(languageKeys.ENGLISH, params),
    outputFilename: outputFilenames[languageKeys.ENGLISH]
  }

  const frenchConfig = {
    stream: getFormatStream(languageKeys.FRENCH, params),
    outputFilename: outputFilenames[languageKeys.FRENCH]
  }

  // Must be sequential because FTP doesn't support concurrent uploads from one connection
  for (const { stream, outputFilename } of ([englishConfig, frenchConfig])) {
    productExporter.run(stream)
    console.log(`Starting to process ${outputFilename}`)
    try {
      await pipeStreamToServer({ ftpClient, readStream: stream, outputFilename })
      console.log(`Successfully processed ${outputFilename}`)
    } catch (error) {
      console.error(`Unable to upload ${outputFilename}:`, error.message)
      errors.push(error.message)
    }
  }

  ftpClient.end()

  if (errors.length === 0) {
    console.log('Uploaded all product catalogs successfully successfully')
  } else {
    console.error(`Errors while trying to process product catalog (${errors.length} total):`, JSON.stringify(errors))
  }
}

module.exports = main
