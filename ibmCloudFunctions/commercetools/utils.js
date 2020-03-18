const { addRetries } = require('../product-consumers/utils');

const getExistingCtStyle = async (styleId, { client, requestBuilder }) => {
  const method = 'GET';

  // HR style IDs correspond to CT product keys, not CT product IDs, so we get
  // the product by key, not by ID
  const uri = requestBuilder.products.byKey(styleId).build();

  try {
    const response = await client.execute({ method, uri });
    return response.body;
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
    'vsn',
    'styleLastModifiedInternal'
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

  // `name` and `description` aren't custom attributes of products in CT, so
  // their update actions differ from the others
  const nameUpdateAction = style.name
    ? { action: 'changeName', name: style.name }
    : null;
  
  const descriptionUpdateAction = style.marketingDescription
    ? { action: 'setDescription', description: style.marketingDescription }
    : null;

  const allUpdateActions = (
    [...customAttributeUpdateActions,
      nameUpdateAction,
      descriptionUpdateAction
    ].filter(Boolean) // removes the `null` actions, if there are any
  );

  return allUpdateActions;
};

const updateStyle = async (style, version, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');
  if (!version) throw new Error('Invalid arguments: must include \'version\'');

  const method = 'POST';
  const uri = requestBuilder.products.byKey(style.id).build();
  const actions = getActionsFromStyle(style);
  const body = JSON.stringify({ version, actions });

  return client.execute({ method, uri, body });
};

const getAttributesFromStyle = style => {
  const customAttributesToCreate = Object.keys(style).filter(isCustomAttribute);
  
  return customAttributesToCreate.map(attribute => ({
      name: attribute,
      value: style[attribute]
    })
  );
};

const createStyle = async (style, productTypeId, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');

  const method = 'POST';
  const uri = requestBuilder.products.build();
  const attributes = getAttributesFromStyle(style);

  const body = JSON.stringify({
    key: style.id, // the style ID is stored as a key, since we can't set a custom ID in CT
    name: style.name,
    description: style.marketingDescription,
    productType: {
      typeId: 'product-type',
      id: productTypeId
    },
    // Since CT attributes apply only at the product variant level, we can't
    // store attribute values at the level of products. So to store the
    // associated with a style that has no SKUs associated with it yet, we need
    // to create a dummy product variant. This dummy variant will be removed
    // when real product variants are added to the product.
    masterVariant: {
      attributes // TODO: add dummy flag
    },
    // TODO: Figure out what to put for the slug. It's required and must be
    // unique, but will we even make use of it? Right now I'm just putting the
    // style ID since I know that's unique.
    slug: {
      'en-CA': style.id,
      'fr-CA': style.id
    }
  });

  return client.execute({ method, uri, body });
};

// Returns the `styleLastModifiedInternal` value of the given ctStyle.
// Given the format of the styles that CT gives us in response to a GET
// request, we have to do some annoying drilling down to get the value that we
// want.
//
// TODO: At some point, it may be worth turning this into a general helper
// function to find the value of any given attribute.
const getCtStyleDate = ctStyle => {
  const getDate = stagedOrCurrent => (
    ctStyle
      .masterData[stagedOrCurrent]
      .masterVariant
      .attributes
      .find(attribute => attribute.name === 'styleLastModifiedInternal')
      .value
  );

  try {
    return new Date(getDate('staged')); // the date we get from the CT style is a string, so we manually create a date out of it
  } catch (err) {
    return null;
  }
};

// Used to determine whether we should update the style in CT. Deals with race
// conditions.
const existingCtStyleIsNewer = (existingCtStyle, givenStyle) => {
  const existingCtStyleDate = getCtStyleDate(existingCtStyle);

  if ((!existingCtStyleDate) || !(givenStyle.styleLastModifiedInternal)) {
    console.warn('Style is missing value `styleLastModifiedInternal`');
    return false;
  }

  return existingCtStyleDate.getTime() > givenStyle.styleLastModifiedInternal.getTime();
};

const createOrUpdateStyle = async (ctHelpers, productTypeId, style) => {
    const existingCtStyle = await getExistingCtStyle(style.id, ctHelpers);

    if (!existingCtStyle) {
      // the given style isn't currently stored in CT, so we create a new one
      return createStyle(style, productTypeId, ctHelpers);
    }
    if (existingCtStyleIsNewer(existingCtStyle, style)) {
      // the given style is out of date, so we don't add it to CT
      return null;
    }
    // the given style is up-to-date and an earlier version of it is already
    // stored in CT, so we just need to update its attributes
    return updateStyle(style, existingCtStyle.version, ctHelpers);
};

module.exports = {
  createStyle,
  updateStyle,
  createOrUpdateStyle: addRetries(createOrUpdateStyle, 2, console.error),
  existingCtStyleIsNewer
};
