const fetch = require('node-fetch');
const { client, requestBuilder } = require('./sdk');

const CT_ENDPOINT = 'https://api.us-central1.gcp.commercetools.com/harryrosen-dev'; // TODO: move to constants or ENV file
const BEARER_TOKEN = process.env.BEARER_TOKEN; // TODO: switch to using secret to fetch fresh bearer token
const PRODUCT_TYPE_REFERENCE = '3f69b1dd-631c-4913-b015-c20c083a7940'; // TODO: move to constants file

const handleError = err => {
  console.error('TODO: add proper error handling');
  console.error(err);
};

// Throws an error if the response status code is unexpected. Otherwise returns
// the parsed data of the response
const checkAPIResponse = async (response, expectedStatus) => {
  const { status } = response;
  const data = await response.json();
  if (status !== expectedStatus) throw new Error(`API call failed (status ${status}): ${JSON.stringify(data)}`);
  return data;
};

const Authorization = `Bearer ${BEARER_TOKEN}`;

const getStyleVersion = async styleId => {
  // HR style IDs correspond to CT product keys, not CT product IDs, so we get
  // the product by key, not by ID
  const uri = requestBuilder.products.byKey(styleId).build();
  const method = 'GET';

  try {
    const response = await client.execute({ uri, method });
    return response.body.version;
  } catch (err) {
      if (err.code === 404) return null; // indicates that style doesn't exist in CT
      throw err;
  }
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

  // `name` isn't a custom attribute of products in CT, so its update action differs from the others
  const nameUpdateAction = style.name ? { action: 'changeName', name: style.name } : null;

  const allUpdateActions = nameUpdateAction
    ? [...customAttributeUpdateActions, nameUpdateAction]
    : customAttributeUpdateActions;

  return allUpdateActions;
};

const updateStyle = async (style, version) => {
  if (!style.id) throw new Error('Style updated be created if it lacks an ID');
  if (!version) throw new Error('Style cannot be updated if we do not know its version');

  const actions = getActionsFromStyle(style);
  const body = JSON.stringify({ version, actions });
  const method = 'POST';
  const uri = requestBuilder.products.byKey(style.id).build();

  return client.execute({ uri, method, body });
};

const getAttributesFromStyle = style => {
  const customAttributesToCreate = Object.keys(style).filter(isCustomAttribute);
  
  return customAttributesToCreate.map(attribute => ({
      name: attribute,
      value: style[attribute]
    })
  );
};

const createStyle = async style => {
  if (!style.id) throw new Error('Style cannot be created if it lacks an ID');

  const method = 'post';
  const headers = { Authorization };
  const attributes = getAttributesFromStyle(style);

  const body = JSON.stringify({
    key: style.id, // the style ID is stored as a key, since we can't set a custom ID in CT
    name: style.name,
    description: style.description,
    productType: {
      typeId: 'product-type',
      id: PRODUCT_TYPE_REFERENCE
    },
    // Since CT attributes apply only at the product variant level, we can't
    // store attribute values at the level of products. So to store the
    // associated with a style that has no SKUs associated with it yet, we need
    // to create a dummy product variant. This dummy variant will be removed
    // when real product variants are added to the product.
    masterVariant: {
      attributes
    },
    // TODO: figure out what to put for the slug (it's required and must be unique, but do we even use it?)
    slug: {
      'en-CA': style.id,
      'fr-CA': style.id
    }
  });

  const response = await fetch(`${CT_ENDPOINT}/products/`, { method, headers, body });
  return checkAPIResponse(response, 201);
};

const createOrUpdateStyle = async style => {
    const currentProductVersion = await getStyleVersion(style.id);

    if (!currentProductVersion) { // the style isn't currently stored in CT, so we create a new one
      return createStyle(style);
    } else { // the style is already stored in CT, so we just need to update its attributes
      return updateStyle(style, currentProductVersion);
    }
};

module.exports = {
  createStyle,
  createOrUpdateStyle,
  handleError
};
