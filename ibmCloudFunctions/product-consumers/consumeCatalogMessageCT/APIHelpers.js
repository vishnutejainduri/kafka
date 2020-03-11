const fetch = require('node-fetch');

const CT_ENDPOINT = 'https://api.us-central1.gcp.commercetools.com/harryrosen-dev'; // TODO: move to constants or ENV file
const BEARER_TOKEN = process.env.BEARER_TOKEN; // TODO: switch to using secret to fetch fresh bearer token
const PRODUCT_TYPE_REFERENCE = '3f69b1dd-631c-4913-b015-c20c083a7940'; // TODO: move to constants file

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
      action: 'setAttributeInAllVariants',
      name: attribute,
      value: style[attribute]
    })
  );

  // `name` isn't a custom attribute of products in CT, so its update action looks different from the others
  const nameUpdateAction = style.name ? { action: 'changeName', name: style.name } : null; // TODO: make sure localized strings are formatted correctly (e.g., `en-CA` keys instead if just `en`)

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

const getAttributesFromStyle = style => {
  const customAttributesToCreate = Object.keys(style).filter(isCustomAttribute);
  
  return customAttributesToCreate.map(attribute => ({
      name: attribute,
      value: style[attribute]
    })
  );
};

// TODO: figure out what to put for the slug (are we even using it for anything? if not, can just put the id, which we know is unique)
const createStyle = style => {
  if (!style.id) throw new Error('Style cannot be created if it lacks an ID');

  const method = 'post';
  const headers = { Authorization };
  const attributes = getAttributesFromStyle(style);

  const body = JSON.stringify({
    key: style.id, // the style ID is stored as a key, since we can't set a custom id
    name: style.name, // TODO: deal with localization
    description: style.description, // TODO: deal with localization
    productType: {
      typeId: 'product-type',
      id: PRODUCT_TYPE_REFERENCE
    },
    // Since CT attributes apply only at the product variant level, we can't
    // store attribute values at the level of products. So to store the
    // associated with a style that has no SKUs associated with it yet, we need
    // to  create a dummy product variant. This dummy variant will be removed
    // when real product variants are added to the product.
    masterVariant: {
      attributes
    },
    slug: {
      'en-CA': style.id,
      'fr-CA': style.id
    }
  });

  return fetch(`${CT_ENDPOINT}/products/`, { method, headers, body });
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
