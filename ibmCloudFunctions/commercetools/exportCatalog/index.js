const path = require('path')
const SftpClient = require('ssh2-sftp-client')
const { logAndThrowErrorMessage } = require('../../product-consumers/utils')
const { getProductExporter } = require('./commercetools')
const { outputFilenames } = require('./config')
const { getFormatStream } = require('./csv')

const sftpClient = new SftpClient()

const main = async params => {
  const productExporter = await getProductExporter(params)
  const locale = params.locale
  const stream = getFormatStream(locale, params)
  const outputFilename = outputFilenames[locale]
  const outputPath = path.join(params.hrSftpFolder, outputFilename)

  try {
    await sftpClient.connect({
      host: params.hrSftpHost,
      port: params.hrSftpPort,
      username: params.hrSftpUser,
      password: params.hrSftpPassword
    })
    console.log('Connected to SFTP server')
  } catch (error) {
    logAndThrowErrorMessage(`Unable to connect to SFTP server: ${error.message}`)
  }

  productExporter.run(stream)
  console.log(`Starting to process ${outputPath} (${locale})`)
  try {
    await sftpClient.put(stream, outputPath)
    console.log(`Successfully uploaded ${outputPath}`)
  } catch (error) {
    logAndThrowErrorMessage(`Unable to upload ${outputPath}: ${error.message}`)
  } finally {
    await sftpClient.end()
  }
}

global.main = main
