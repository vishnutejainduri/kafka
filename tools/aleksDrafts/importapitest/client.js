require('dotenv').config()
const axios = require('axios');
const qs = require('qs');
const btoa = require('btoa');

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
  scopes: [`manage_project:${projectKey}`,`manage_import_sinks:${projectKey}`],
  fetch,
})

const httpMiddleware = createHttpMiddleware({
  host: 'https://api.commercetools.co',
  fetch,
})

const getClient = (envVariables) => createClient({
  middlewares: [authMiddleware(envVariables), httpMiddleware],
})

const getAccessToken = async (envVariables) => {
  const basicAuth = 'Basic ' + btoa(envVariables.clientId + ':' + envVariables.clientSecret);
  const data = {
    grant_type: 'client_credentials',
    scope: `manage_import_sinks:${envVariables.projectKey} manage_products:${envVariables.projectKey}`,
  }
  const options = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'Authorization': basicAuth },
    data: qs.stringify(data),
    url: 'https://auth.us-central1.gcp.commercetools.com/oauth/token'
  };
  //console.log('options', options);
  return axios(options)
  .then(function (response) {
    //console.log(response);
    return { token: response.data.access_token, projectKey: envVariables.projectKey }
  })
  .catch(function (error) {
    //console.log(error);
  });
}

const getRequestBuilder = ({ projectKey }) => createRequestBuilder({ projectKey });

const getCtHelpers = async (environment) => {
  const envVariables = getEnvironmentVariables(environment);

  const accessToken = await getAccessToken(envVariables)
  return accessToken;
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
    case 'prod':
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
