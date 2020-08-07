require('dotenv').config()
const { createClient } = require('@commercetools/sdk-client');
const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth');
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http');
const { createRequestBuilder } = require('@commercetools/api-request-builder');

const fetch = require('node-fetch');

const authMiddleware = ({ projectKey, clientId, clientSecret }) => createAuthMiddlewareForClientCredentialsFlow({
  host: 'https://auth.commercetools.co',
  projectKey,
  credentials: {
    clientId,
    clientSecret,
  },
  scopes: [`manage_project:${projectKey}`],
  fetch,
})

const httpMiddleware = createHttpMiddleware({
  host: 'https://api.commercetools.co',
  fetch,
})

const getClient = (envVariables) => createClient({
  middlewares: [authMiddleware(envVariables), httpMiddleware],
})

const getRequestBuilder = ({ projectKey }) => createRequestBuilder({ projectKey });

const getCtHelpers = (environment) => {
  const envVariables = getEnvironmentVariables(environment);

  const client = getClient(envVariables);
  const requestBuilder = getRequestBuilder(envVariables);
  return { client, requestBuilder };
};

const getEnvironmentVariables = (environment) => {
  let projectKey;
  let clientId;
  let clientSecret;

  switch (environment) {
    case 'dev':
      projectKey = process.env.PROJECT_KEY_DEV;
      clientId = process.env.CLIENT_ID_DEV;
      clientSecret = process.env.CLIENT_SECRET_DEV;
      break;
    case 'development':
      projectKey = process.env.PROJECT_KEY_DEVELOPMENT
      clientId = process.env.CLIENT_ID_DEVELOPMENT;
      clientSecret = process.env.CLIENT_SECRET_DEVELOPMENT;
      break;
    case 'staging':
      projectKey = process.env.PROJECT_KEY_STAGING
      clientId = process.env.CLIENT_ID_STAGING;
      clientSecret = process.env.CLIENT_SECRET_STAGING;
      break;
    case 'production':
      projectKey = process.env.PROJECT_KEY_PRODUCTION
      clientId = process.env.CLIENT_ID_PRODUCTION;
      clientSecret = process.env.CLIENT_SECRET_PRODUCTION;
      break;
    default:
      projectKey = null;
      clientId = null;
      clientSecret = null;
  };

  return { projectKey, clientId, clientSecret };
};

module.exports.getCtHelpers = getCtHelpers;
