const fetch = require('node-fetch').default
const { logAndThrowErrorMessage } = require('../../product-consumers/utils')

const main = async params => {
  const { ctpApiExtensionsAuthorization, productExportTriggerUrl } = params

  try {
    const response = await fetch(productExportTriggerUrl, {
      method: 'post',
      headers: { authorization: ctpApiExtensionsAuthorization }
    })
    if (!(response.status === 202)) throw new Error(`Received non-202 response from product API: ${response.status} ${await response.text()}`)
  } catch (error) {
    logAndThrowErrorMessage(error.message)
  }

  console.log('Successfully triggered catalog export')
}

global.main = main
