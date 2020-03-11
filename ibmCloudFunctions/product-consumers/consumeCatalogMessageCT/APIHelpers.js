const fetch = require('node-fetch');

const CT_ENDPOINT = 'https://api.us-central1.gcp.commercetools.com/harryrosen-dev'; // TODO: move to constants or ENV file
const BEARER_TOKEN = process.env.BEARER_TOKEN; // TODO: switch to using secret to fetch fresh bearer token

const handleAPIError = err => {
  console.error('TODO: add proper error handling');
  console.error(err);
};

const Authorization = `Bearer ${BEARER_TOKEN}`;

const getStyleVersion = async styleId => {
  // HR style IDs correspond to CT product keys, not CT product IDs, so we get
  // the product by key, not by ID
  const response = await fetch(`${CT_ENDPOINT}/products/key=${styleId}`, { headers: { Authorization }});

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
  const body = JSON.stringify({ version, actions });
  const headers = { Authorization };
  const method = 'post';

  return fetch(`${CT_ENDPOINT}/products/key=${style.id}`, { method, headers, body });
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

module.exports = {
  createOrUpdateStyle,
  handleAPIError
};
