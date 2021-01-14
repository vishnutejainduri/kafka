const fetch = require('node-fetch').default
const ProductExporter = require('@commercetools/product-exporter') // https://commercetools.github.io/nodejs/cli/product-exporter.html
const SdkAuth = require('@commercetools/sdk-auth') // https://commercetools.github.io/nodejs/sdk/api/sdkAuth.html
const { exportConfig, logger } = require('./config')

let cachedAuthClient

const getAuthClient = ({
  ctpAuthUrl,
  ctpClientId,
  ctpClientSecret,
  ctpProjectKey,
  ctpScopes
}) => {
  if (!cachedAuthClient) {
    cachedAuthClient = new SdkAuth.default({
      host: ctpAuthUrl,
      projectKey: ctpProjectKey,
      disableRefreshToken: false,
      credentials: {
        clientId: ctpClientId,
        clientSecret: ctpClientSecret
      },
      scopes: ctpScopes.split(','),
      fetch
    })
  }
  return cachedAuthClient
}

const getAccessToken = async ({
  ctpAuthUrl,
  ctpClientId,
  ctpClientSecret,
  ctpProjectKey,
  ctpScopes
}) => {
  const authClient = getAuthClient({ ctpAuthUrl, ctpClientId, ctpClientSecret, ctpProjectKey, ctpScopes })
  const token = await authClient.clientCredentialsFlow()
  return token.access_token
}

const getProductExporter = async ({
  ctpApiUrl,
  ctpAuthUrl,
  ctpClientId,
  ctpClientSecret,
  ctpProjectKey,
  ctpScopes
}) => {
  const accessToken = await getAccessToken({ ctpAuthUrl, ctpClientId, ctpClientSecret, ctpProjectKey, ctpScopes })

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
