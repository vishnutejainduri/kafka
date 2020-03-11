const fetch = require('node-fetch');
const { parseStyleMessage, filterStyleMessages } = require('../../lib/parseStyleMessage');
const { addErrorHandling, log, createLog } = require('../utils');

const CT_ENDPOINT = 'https://api.us-central1.gcp.commercetools.com/harryrosen-dev'; // TODO: move to constants or ENV file
const BEARER_TOKEN = process.env.BEARER_TOKEN; // TODO: switch to using secret to fetch fresh bearer token

const validateParams = params => {
  if (!params.topicName) {
    throw new Error('Requires an Event Streams topic.');
  }

  if (!params.messages || !params.messages[0] || !params.messages[0].value) {
    throw new Error('Invalid arguments. Must include \'messages\' JSON array with \'value\' field');
  }
};

const handleAPIError = err => {
  console.error('TODO: add proper error handling');
  console.error(err);
}

const Authorization = `Bearer ${BEARER_TOKEN}`;

const getStyleVersion = async styleId => {
  const response = await fetch(`${CT_ENDPOINT}/products/${styleId}`, { headers: { Authorization }}); // TODO: change to key (which can be custom, to correspond to the style IDå--the ID is just whatever CT spits out)
  if (response.status === 404) return null; // indicates that style doesn't exist in CT
  const style = await response.json();
  return style.version;
};

// Returns true iff the given attribute is a custom attribute on the HR product
// type defined in CT
const isCustomAttribute = attribute => {
  const customAttributes = [
    'season',
    'brandName',
    'construction',
    'fabricAndMaterials',
    'styleAndMeasurements',
    'careInstructions',
    'advice',
    'webStatus',
    'vsn'
  ];

  return customAttributes.includes(attribute);
};

// Returns an array of actions, each of which tells CT to update a different
// attribute of the given style
const getActionsFromStyle = style => {
  const customAttributesToUpdate = Object.keys(style).filter(isCustomAttribute);

  const customAttributeUpdateActions = customAttributesToUpdate.map(attribute => ({
    action: "setAttributeInAllVariants",
    name: attribute,
    value: style[attribute]
  }));

  // `name` isn't a custom attribute of products in CT, so its update action looks different from the others
  const nameUpdateAction = style.name ? { action: "changeName", name: style.name } : null; // TODO: make sure localized strings are formatted correctly (e.g., `en-CA` keys instead if just `en`)

  const allUpdateActions = nameUpdateAction
    ? [...customAttributeUpdateActions, nameUpdateAction]
    : customAttributeUpdateActions;

  return allUpdateActions;
};

const updateStyle = (style, version) => {
  const actions = getActionsFromStyle(style);
  const body = JSON.stringify({ version, actions }); // stringify?
  const headers = { Authorization };
  const method = 'post';

  return fetch(`${CT_ENDPOINT}/products/${style.id}`, { method, headers, body }); // TODO: change to ?key=...
};

const createStyle = style => {
  // TODO: remember to set a key to the value of style.id
};

const createOrUpdateStyle = async style => {
  try {
    const currentProductVersion = await getStyleVersion(style.id);
    if (!currentProductVersion) { // the style isn't currently stored in CT, so we create a new one
      return createStyle(style);
    } else { // the style is already stored in CT, so we just need to update its attributes
      return updateStyle(style, currentProductVersion);
    }
  } catch (err) {
    handleAPIError(err);
  }
};

const main = async params => {
  log(createLog.params('consumeCatalogMessageCT', params));
  validateParams();
  
  const stylesToAddOrUpdate = params.messages.filter(filterStyleMessages).map(parseStyleMessage);

  for (const style of stylesToAddOrUpdate) {
    try {
      createOrUpdateStyle(style);
    } catch (err) {
      handleAPIError(err);
    }
  }
};

const test = async () => {
  console.log('testing...')
  // const result = await getStyleVersion('7057e573-91b6-4801-8312-5ba0a579094c');
  const testStyle = {
    'id': '7057e573-91b6-4801-8312-5ba0a579094c',
    'name': {
      'en-CA': 'New English name',
      'fr-CA': 'New French name'
    },
    'season': 'Winter 2021',
    'vsn': 'xyz321'
  }
  const result = await createOrUpdateStyle(testStyle);
  console.log(result);
};

test();

module.exports = main;
