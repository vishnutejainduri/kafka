const fs = require('fs');
const axios = require('axios');

let totalFailures = 0;
let totalSuccess = 0;

const wstreamError = fs.createWriteStream('errors.csv');
const wstreamOutput = fs.createWriteStream('output.csv');

const importProduct = async (baseUrl, importSinkKey, token, projectKey) => {
  const importProductDraft = {
    "type" : "product-draft",
    "resources" : [ {
      "key": "66666666",
      "name" : {
        "en" : "blue shirt"
      },
      "slug" : {
        "en" : "blue-t-shirt"
      },
      "productType" : {
        "typeId" : "product-type",
        "key" : "73d80a90-b4e9-4306-9466-86ea6a7b8c26"
      },
      "masterVariant" : {
        "attributes" : [ {
          "type" : "text",
          "name" : "season",
          "value" : "some random aleks test season"
        } ]
      }
    } ]
  }

  body = JSON.stringify(importProductDraft);
  options = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${token}` },
    data: body,
    url: `${baseUrl}/${projectKey}/product-drafts/importSinkKey=${importSinkKey}`
  };
  return axios(options)
  .catch(function (error) {
    console.log(error);
  });
}

const runImport = async (token, projectKey) => {
  const baseUrl = 'https://import.us-central1.gcp.commercetools.com'
  const importSinkDraft = {
    "key" : "product-import-sink",
    "version" : 1,
    "resourceType" : "product"
  }
  let body = JSON.stringify(importSinkDraft);

  let options = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${token}` },
    data: body,
    url: `${baseUrl}/${projectKey}/import-sinks`
  };
  const importSinkResponse = await axios(options)
  .catch(function (error) {
    console.log(error);
  });
  const importSinkKey = importSinkResponse.data.key

  const response = await importProduct(baseUrl, importSinkKey, token, projectKey);
  console.log('response', response.data);

  options = {
    method: 'GET',
    headers: { 'content-type': 'application/json', 'Authorization': `Bearer ${token}` },
    //url: `${baseUrl}/${projectKey}/import-summaries/importSinkKey=${importSinkKey}`
    url: `${baseUrl}/${projectKey}/product-drafts/importSinkKey=${importSinkKey}/import-operations/${response.data.operationStatus[0].operationId}`
  };
  const importSinkStatusResponse = await axios(options)
  .catch(function (error) {
    console.log(error);
  });
  return importSinkStatusResponse.data
}

const runProductImport = (token, projectKey) => runImport(token, projectKey);

module.exports = {
  runProductImport
}
