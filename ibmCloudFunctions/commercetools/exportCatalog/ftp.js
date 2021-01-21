const FtpClient = require('ftp')

const getFtpClient = ({
  hrFtpHost: host,
  hrFtpPort: port,
  hrFtpUser: user,
  hrFtpPassword: password
}) => 
  new Promise((resolve, reject) => {
    const ftpClient = new FtpClient()
    ftpClient.connect({ host, port, user, password } )
    ftpClient.on('ready', resolve(ftpClient))
    ftpClient.on('error', reject)
  })

const pipeStreamToServer = ({ ftpClient, readStream, outputFilename }) =>
  new Promise((resolve, reject) => {
    ftpClient.put(readStream, outputFilename, false, (error, response) => {
      if (error) {
        reject(error)
      } else {
        resolve(response)
      }
    })
  })

module.exports = {
  getFtpClient,
  pipeStreamToServer
}
