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

const {
  CTP_PROJECT_KEY,
  CTP_CLIENT_ID,
  CTP_CLIENT_SECRET,
  CTP_AUTH_URL,
  CTP_API_URL,
  CTP_SCOPES
} = process.env;

const authMiddleware = createAuthMiddlewareForClientCredentialsFlow({
  host: CTP_AUTH_URL,
  projectKey: CTP_PROJECT_KEY,
  credentials: {
      clientId: CTP_CLIENT_ID,
      clientSecret: CTP_CLIENT_SECRET,
  },
  scopes: [CTP_SCOPES],
  fetch
});

const httpMiddleware = createHttpMiddleware({
  host: CTP_API_URL,
  fetch
});

const client = createClient({
  middlewares: [authMiddleware, httpMiddleware]
});

const requestBuilder = createRequestBuilder({ projectKey: CTP_PROJECT_KEY });

module.exports = {
  client,
  requestBuilder
};
