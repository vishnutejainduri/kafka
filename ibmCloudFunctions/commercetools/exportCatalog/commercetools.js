const fetch = require('node-fetch').default
const ProductExporter = require('@commercetools/product-exporter') // https://commercetools.github.io/nodejs/cli/product-exporter.html
const { exportConfig, logger } = require('./config')

const getAccessToken = async ({ ctpClientId, ctpClientSecret, ctpAuthUrl }) => {
  const response = await fetch(`${ctpAuthUrl}/oauth/token?grant_type=client_credentials`, {
    method: 'post',
    headers: {
      authorization: `Basic ${Buffer.from(`${ctpClientId}:${ctpClientSecret}`).toString('base64')}`
    }
  })

  try {
    const accessToken = (await response.json()).access_token
    if (accessToken) return accessToken
    throw new Error(JSON.stringify(response))
  } catch (error) {
    throw new Error(`Cannot get access token (ctpClientId: ${ctpClientId}; ctpAuthUrl: ${ctpAuthUrl}):`, error)
  }
}

const getProductExporter = async ({
  ctpApiUrl,
  ctpAuthUrl,
  ctpClientId,
  ctpClientSecret,
  ctpProjectKey
}) => {
  const accessToken = await getAccessToken({ ctpAuthUrl, ctpClientId, ctpClientSecret })
  const apiConfig = {
    host: ctpAuthUrl,
    apiUrl: ctpApiUrl,
    projectKey: ctpProjectKey,
    credentials: {
      clientId: ctpClientId,
      clientSecret: ctpClientSecret
    }
  }

  return new ProductExporter.default(
    apiConfig,
    exportConfig,
    logger,
    accessToken
  )
}

module.exports = {
  getProductExporter
}
