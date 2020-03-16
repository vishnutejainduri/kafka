/**
 * The commercetools SDK makes it easier to send requests to the CT client,
 * though we could, if we wanted to, just make normal fetch requests.
 * 
 * Most of this code is based on examples in CT's documentation (e.g.,
 * https://docs.commercetools.com/assets/code/lambda-reusing-client-example.js).
 * 
 */
const { createClient } = require('@commercetools/sdk-client');
const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth');
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http');
const { createRequestBuilder } = require('@commercetools/api-request-builder');
const fetch = require('node-fetch');

const validateConnectionInfo = ({
  ctpProjectKey,
  ctpClientId,
  ctpClientSecret,
  ctpAuthUrl,
  ctpApiUrl,
  ctpScopes
}) => {
  if (!(ctpProjectKey && ctpClientId && ctpClientSecret && ctpAuthUrl && ctpApiUrl && ctpScopes)) {
    throw new Error('Incomplete connection info');
  }
};

/**
 * @returns an object of the form {client, requestBuilder}. See the
 * commercetools SDK documentation for information on how to use `client` and
 * `requestBuilder`: https://commercetools.github.io/nodejs/
 * @param {Object} connectionInfo
 */
const getCtHelpers = connectionInfo => {
  validateConnectionInfo(connectionInfo);

  const {
    ctpProjectKey,
    ctpClientId,
    ctpClientSecret,
    ctpAuthUrl,
    ctpApiUrl,
    ctpScopes
  } = connectionInfo;

  const authMiddleware = createAuthMiddlewareForClientCredentialsFlow({
    host: ctpAuthUrl,
    projectKey: ctpProjectKey,
    credentials: {
        clientId: ctpClientId,
        clientSecret: ctpClientSecret,
    },
    scopes: [ctpScopes],
    fetch
  });

  const httpMiddleware = createHttpMiddleware({
    host: ctpApiUrl,
    fetch
  });

  const client = createClient({
    middlewares: [authMiddleware, httpMiddleware]
  });

  const requestBuilder = createRequestBuilder({ projectKey: ctpProjectKey });

  return {
    client,
    requestBuilder
  };
};

module.exports = getCtHelpers;
