const {
  styleAttributeNames,
  currencyCodes,
  languageKeys,
  isStaged,
  TAX_CATEGORY,
  PRODUCT_SHOULD_BE_PUBLISHED,
  entityStatus,
  priceTypes,
  MICROSITES_ROOT_CATEGORY
} = require('./constantsCt');
const { getAllVariantPrices, getExistingCtOriginalPrice, getExistingCtPermanentMarkdown } = require('./consumeSalePriceCT/utils');

/**
 * Generates a category key based on the names of the category and all it's ancestors.
 * @param {Array<string|LocalizedString>} categoryNames
 * @return {string}
 */
const categoryKeyFromNames = (...categoryNames) => {
  return categoryNames
    .map((categoryName) => {
      return categoryName instanceof Object && Object.prototype.hasOwnProperty.call(categoryName, languageKeys.ENGLISH)
        ? categoryName[languageKeys.ENGLISH]
        : categoryName;
    })
    .map((categoryName) => categoryName.replace(/[^a-zA-Z0-9_]/g, ''))
    .reduce((categoryKey, categoryName, index) => {
      return index > 0
        ? categoryKey + `-l${index}` + categoryName
        : categoryName;
    }, '');
};

const DPM_ROOT_CATEGORY = 'DPM ROOT CATEGORY';
const BRANDS_ROOT_CATEGORY = 'BRANDS';

const createCategory = async (categoryKey, categoryName, parentCategory, { client, requestBuilder }) => {
  if (!categoryKey || !categoryName) return null;
  const method = 'POST';
  const uri = requestBuilder.categories.build();

  const body = {
    key: categoryKey,
    name: categoryName,
    slug: {
      [languageKeys.ENGLISH]: categoryKey,
      [languageKeys.FRENCH]: categoryKey
    }
  };

  if (parentCategory) {
    body.parent = {
      id: parentCategory.id,
      typeId: 'category'
    };
  }

  const requestBody = JSON.stringify(body);

  const response = await client.execute({ method, uri, body: requestBody });
  return response.body;
};

const updateCategory = async (categoryKey, categoryVersion, categoryName, parentCategory, { client, requestBuilder }) => {
  if (!categoryKey || !categoryName) return null;
  const method = 'POST';
  const uri = requestBuilder.categories.byKey(categoryKey).build();


  const body = {
    version: categoryVersion,
    actions: [{
      action: 'changeName',
      name: categoryName
    }]
  };

  if (parentCategory) {
    body.actions.push({
      action: 'changeParent',
      parent: {
        id: parentCategory.id,
        typeId: 'category'
      }
    })
  }

  const requestBody = JSON.stringify(body);

  const response = await client.execute({ method, uri, body: requestBody })
  return response.body;
};

const getCategory = async (category, { client, requestBuilder }) => {
  if (!category) return null;
  const method = 'GET';

  const uri = requestBuilder.categories.byKey(category).build();

  try {
    const response = await client.execute({ method, uri });
    return response.body;
  } catch (err) {
      if (err.code === 404) return null;
      throw err;
  }
};

const categoryNeedsUpdating = (fetchedCategory, categoryName) => {
  return fetchedCategory.name[languageKeys.ENGLISH] !== categoryName[languageKeys.ENGLISH]
    || fetchedCategory.name[languageKeys.FRENCH] !== categoryName[languageKeys.FRENCH];
};

const createOrUpdateCategoriesFromStyle = async (style, ctHelpers) => {
  const enCA = languageKeys.ENGLISH;
  const frCA = languageKeys.FRENCH;

  // TODO
  // bug 1: this uses the en-CA label for the category name and not the category code from the dictionaryitem
  //  table. this means that changing the label will change the key for the category.
  const categoryKeys = [
    categoryKeyFromNames(DPM_ROOT_CATEGORY),
    categoryKeyFromNames(DPM_ROOT_CATEGORY, style.level1Category),
    categoryKeyFromNames(DPM_ROOT_CATEGORY, style.level1Category, style.level2Category),
    categoryKeyFromNames(DPM_ROOT_CATEGORY, style.level1Category, style.level2Category, style.level3Category),
  ];
  const brandCategoryKeys = [
    categoryKeyFromNames(BRANDS_ROOT_CATEGORY),
    categoryKeyFromNames(BRANDS_ROOT_CATEGORY, style.brandName[enCA])
  ];

  const categories = await Promise.all(categoryKeys.map(key => getCategory(key, ctHelpers)));
  const brandCategories = await Promise.all(brandCategoryKeys.map(key => getCategory(key, ctHelpers)));

  if (!categories[0]) {
    categories[0] = await createCategory(categoryKeys[0], {
      [enCA]: DPM_ROOT_CATEGORY,
      [frCA]: DPM_ROOT_CATEGORY
    }, null, ctHelpers);
  }

  for (let i = 1; i < categories.length; i++) {
    if (!categories[i]) {
      categories[i] = await createCategory(categoryKeys[i], style[`level${i}Category`], categories[i - 1], ctHelpers);
    } else if (categoryNeedsUpdating(categories[i], style[`level${i}Category`])) {
      categories[i] = await updateCategory(categoryKeys[i], categories[i].version, style[`level${i}Category`], categories[i - 1], ctHelpers);
    }
  }

  if (!brandCategories[0]) {
    brandCategories[0] = await createCategory(brandCategoryKeys[0], {
      [enCA]: BRANDS_ROOT_CATEGORY,
      [frCA]: BRANDS_ROOT_CATEGORY
    }, null, ctHelpers);
  }

  if (!brandCategories[1]) {
    brandCategories[1] = await createCategory(brandCategoryKeys[1], { [enCA]: style.brandName[enCA], [frCA]: style.brandName[enCA] }, brandCategories[0], ctHelpers);
  } else if (categoryNeedsUpdating(brandCategories[1], { [enCA]: style.brandName[enCA], [frCA]: style.brandName[enCA] })) {
    brandCategories[1] = await updateCategory(brandCategoryKeys[1], brandCategories[1].version, { [enCA]: style.brandName[enCA], [frCA]: style.brandName[enCA] }, brandCategories[0], ctHelpers);
  }

  return [...categories.slice(1, categories.length), ...brandCategories.slice(1, brandCategories.length)].filter(Boolean);
};

function createPriceUpdate (originalPrice, priceTypeValue = priceTypes.ORIGINAL_PRICE, priceChangeIdValue = null, processDateCreatedValue = null, startDateValue = null, endDateValue = null) {
  const priceUpdate = {
    country: 'CA',
    value: {
      currencyCode: currencyCodes.CAD,
      centAmount: originalPrice
    },
    custom: {
      type: {
        key: 'priceCustomFields'
      },
      fields: {
        priceType: priceTypeValue
      }
    }
  }

  if (processDateCreatedValue) priceUpdate.custom.fields.processDateCreated = processDateCreatedValue
  if (priceChangeIdValue) priceUpdate.custom.fields.priceChangeId = priceChangeIdValue
  if (startDateValue && endDateValue) {
    priceUpdate.validFrom = startDateValue
    priceUpdate.validUntil = endDateValue
  }

  return priceUpdate;
}

const getProductType = async (productTypeId, { client, requestBuilder }) => {
  const method = 'GET';

  const uri = requestBuilder.productTypes.byId(productTypeId).build();

  try {
    const response = await client.execute({ method, uri });
    return response.body;
  } catch (err) {
      if (err.code === 404) return null;
      throw err;
  }
};

/**
 * Returns the value of the attribute in the given CT style. The value is taken
 * from the master variant. Returns `undefined` if the attribute does not exist.
 * @param {Object} ctStyle The product as stored in CT.
 * @param {String} attributeName Name of the attribute whose value should be returned.
 */
const getCtStyleAttributeValue = (ctStyle, attributeName) => {
  const foundAttribute =  (
    ctStyle
    .masterData[entityStatus]
    .masterVariant
    .attributes
    .find(attribute => attribute.name === attributeName)
  );

  if (!foundAttribute) return undefined;
  return foundAttribute.value;
};

const getCtStyleAttribute = (ctStyle, attributeName) => {
  const attribute = ctStyle.masterData.current ? getCtStyleAttributeValue(ctStyle, attributeName) : null;

  if (!attribute) return null;
  return attribute;
};

const formatAttributeValue = (style, actionObj, attribute, attributeType) => {
  if (attributeType === 'money') {
    actionObj.value = {
      currencyCode: currencyCodes.CAD,
      centAmount: style[attribute]
    }
    if (!style[attribute]) delete actionObj.value;
  }

  return actionObj;
};

// Returns true iff the given attribute is a custom attribute on the HR product
// type defined in CT
const isCustomAttribute = attribute => {
  const styleCustomAttributes = Object.values(styleAttributeNames);
  return styleCustomAttributes.includes(attribute);
};

const getUniqueCategoryIdsFromCategories = categories => {
  if (!categories) return null;
  return [...new Set(categories.map(category => category.id))];
};

// Returns an array of actions, each of which tells CT to update a different
// attribute of the given style
const getActionsFromStyle = (style, productType, categories, existingCtStyle) => {
  let customAttributesToUpdate = Object.keys(style).filter(isCustomAttribute);

  const customAttributeUpdateActions = customAttributesToUpdate.map(attribute => {
    const attributeTypeOj = productType.attributes.find((attributeType) => attributeType.name === attribute)
    const attributeType = attributeTypeOj ? attributeTypeOj.type.name : null;
    let actionObj = {
      action: 'setAttributeInAllVariants',
      name: attribute,
      value: style[attribute],
      staged: isStaged
    };

    actionObj = formatAttributeValue(style, actionObj, attribute, attributeType);

    return actionObj;
  })

  // `name` and `description` aren't custom attributes of products in CT, so
  // their update actions differ from the others
  const nameUpdateAction = style.name
    ? { action: 'changeName', name: style.name, staged: isStaged }
    : null;

  const descriptionUpdateAction = style.marketingDescription
    ? { action: 'setDescription', description: style.marketingDescription, staged: isStaged }
    : null;

  // handle categories
  const existingCtStyleData = existingCtStyle.masterData && (existingCtStyle.masterData[entityStatus])
  const existingCategories = existingCtStyleData && existingCtStyleData.categories
    ? existingCtStyleData.categories.map(category => ({ id: category.id, parentKey: category.obj.parent.obj.key }))
    : null
  const categoryIds = getUniqueCategoryIdsFromCategories(categories);

  // category actions, remove only those not present in coming request
  const categoriesRemoveAction = categoryIds && existingCategories
    ? existingCategories.filter(category => !categoryIds.includes(category.id) && category.parentKey !== MICROSITES_ROOT_CATEGORY)
        .map(category => ({ action: 'removeFromCategory', category: { id: category.id, typeId: 'category'}, staged: isStaged } ))
    : [];

  // category actions, add only those not present already in CT
  const categoriesAddAction = categoryIds && existingCategories
    ? categoryIds.filter(categoryId => !existingCategories.find(category => category.id === categoryId))
      .map(categoryId => ({ action: 'addToCategory', category: { id: categoryId, typeId: 'category' }, staged: isStaged }))
    : [];

  const allVariantPrices = getAllVariantPrices(existingCtStyle);
  let priceUpdateActions = style.originalPrice
    ? allVariantPrices.map((variantPrice) => {
      const existingCtOriginalPrice = getExistingCtOriginalPrice(variantPrice);
      const existingCtPermanentMarkdown = getExistingCtPermanentMarkdown(variantPrice);
      if (!existingCtOriginalPrice && existingCtPermanentMarkdown) return [];
      const priceUpdate = existingCtOriginalPrice
          ? {
            action: 'changePrice',
            priceId: existingCtOriginalPrice.id,
            price: createPriceUpdate(style.originalPrice, priceTypes.ORIGINAL_PRICE),
            staged: isStaged
          }
          : {
            action: 'addPrice',
            variantId: variantPrice.variantId,
            price: createPriceUpdate(style.originalPrice, priceTypes.ORIGINAL_PRICE),
            staged: isStaged
          }
        return [priceUpdate];
    })
    : []
  priceUpdateActions = priceUpdateActions.reduce((finalActions, currentActions) => [...finalActions, ...currentActions], []);

  // Tax category is currently set on product creation, but it wasn't always.
  // This is to set the tax categories of any products that were created before
  // we made that change.
  // There should be only one tax category in CT, and all products should fall
  // under it.
  const taxCategoryUpdateAction = existingCtStyle.taxCategory ? null : {
    action: 'setTaxCategory',
    taxCategory: {
      key: TAX_CATEGORY
    }
  }

  const allUpdateActions = [...customAttributeUpdateActions, nameUpdateAction, descriptionUpdateAction, ...priceUpdateActions,
    ...categoriesAddAction, ...categoriesRemoveAction, taxCategoryUpdateAction].filter(Boolean);

  return allUpdateActions;
};

const updateStyle = async ({ style, existingCtStyle, productType, categories, ctHelpers }) => {
  const { client, requestBuilder } = ctHelpers;
  if (!style.id) throw new Error('Style lacks required key \'id\'');
  if (!existingCtStyle.version) throw new Error('Invalid arguments: must include existing style \'version\'');

  const method = 'POST';
  const uri = requestBuilder.products.byKey(style.id).build();
  const actions = getActionsFromStyle(style, productType, categories, existingCtStyle);
  const body = JSON.stringify({ version: existingCtStyle.version, actions });

  return client.execute({ method, uri, body });
};

const getAttributesFromStyle = (style, productType) => {
  const customAttributesToCreate = Object.keys(style).filter(isCustomAttribute);

  return customAttributesToCreate.map(attribute => {
      const attributeType = productType.attributes.find((attributeType) => attributeType.name === attribute).type.name;
      if (style[attribute] !== undefined) {
        let attributeCreation = {
          name: attribute,
          value: style[attribute]
        };

        attributeCreation = formatAttributeValue(style, attributeCreation, attribute, attributeType);
        return attributeCreation;
      } else {
        return null;
      }
  }).filter(attributeCreation => attributeCreation)
};

const createStyle = async (style, productType, categories, { client, requestBuilder }) => {
  if (!style.id) throw new Error('Style lacks required key \'id\'');

  const method = 'POST';
  const uri = requestBuilder.products.build();
  const attributes = getAttributesFromStyle(style, productType);

  const body = {
    key: style.id, // the style ID is stored as a key, since we can't set a custom ID in CT
    name: style.name,
    description: style.marketingDescription,
    productType: {
      typeId: 'product-type',
      id: productType.id
    },
    taxCategory: {
      key: TAX_CATEGORY
    },
    // Since CT attributes apply only at the product variant level, we can't
    // store attribute values at the level of products. So to store the
    // associated with a style that has no SKUs associated with it yet, we need
    // to create a dummy product variant.
    masterVariant: {
      sku: style.id, // setting a SKU ID on the master variant helps improve performance
      attributes
    },
    // TODO: Figure out what to put for the slug. It's required and must be
    // unique, but will we even make use of it? Right now I'm just putting the
    // style ID since I know that's unique.
    slug: {
      [languageKeys.ENGLISH]: style.id,
      [languageKeys.FRENCH]: style.id
    }
  };

  if (style.originalPrice) {
    body.masterVariant.prices = [createPriceUpdate(style.originalPrice, priceTypes.ORIGINAL_PRICE)];
  }
  if (categories) {
    body.categories = categories.map(category => ({
      typeId: 'category',
      id: category.id
    }));
  }
  const requestBody = JSON.stringify(body);

  return client.execute({ method, uri, body: requestBody });
};

/**
 * Publishes a style
 * @param {any} style 
 * @param {{ requestBuilder: any, client: any}} ctHelpers 
 */
const publishStyle = async (style, { requestBuilder, client}) => {
  const method = 'POST';
  const uri = requestBuilder.products.byKey(style.key).build();
  const body = JSON.stringify({ version: style.version, actions: [{ action: 'publish', scope: 'All' }] });

  return (await client.execute({ method, uri, body }));
}

// When you create a style in CT, it starts out unpublished. You need to make
// an additional API call to tell CT to publish it.
const createAndPublishStyle = async (styleToCreate, productType, categories, ctHelpers) => {
  const newStyle = (await createStyle(styleToCreate, productType, categories, ctHelpers)).body;
  return publishStyle(newStyle, ctHelpers)
};

// Used to determine whether we should update the style in CT. Deals with race
// conditions.
const existingCtStyleIsNewer = (existingCtStyle, givenStyle, dateAttribute) => {
  const existingCtStyleDateAttributeValue = getCtStyleAttribute(existingCtStyle, dateAttribute);
  if (!existingCtStyleDateAttributeValue) return false;
  if (!givenStyle[dateAttribute]) return false;

  const existingCtStyleDate = new Date(existingCtStyleDateAttributeValue);

  return existingCtStyleDate.getTime() > givenStyle[dateAttribute].getTime()
};

/**
 * Checks if a style exists or not. If the style exists but is not published, will publish it.
 * @param {string} styleId 
 * @param {{ client: any, requestBuilder: any }} ctHelpers
 */
const getExistingCtStyle = async (styleId, { client, requestBuilder }) => {
  const method = 'GET';

  // HR style IDs correspond to CT product keys, not CT product IDs, so we get
  // the product by key, not by ID
  const uri = requestBuilder.products.byKey(styleId).expand('masterData.current.categories[*].parent').build();

  try {
    const response = await client.execute({ method, uri });
    let existingCtStyle = response.body
    if (!existingCtStyle.masterData.published && PRODUCT_SHOULD_BE_PUBLISHED) {
      existingCtStyle = (await publishStyle(existingCtStyle, { client, requestBuilder })).body
    }
    return existingCtStyle;
  } catch (err) {
      if (err.code === 404) return null; // indicates that style doesn't exist in CT
      throw err;
  }
};

const createOrUpdateStyle = async (ctHelpers, productTypeId, style) => {
    const productType = await getProductType(productTypeId, ctHelpers);
    let existingCtStyle = await getExistingCtStyle(style.id, ctHelpers);

    if (!existingCtStyle) {
      // the given style isn't currently stored in CT, so we create a new one
      const categories = await createOrUpdateCategoriesFromStyle(style, ctHelpers);
      return createAndPublishStyle(style, productType, categories, ctHelpers);
    }

    if (existingCtStyleIsNewer(existingCtStyle, style, styleAttributeNames.STYLE_LAST_MODIFIED_INTERNAL)) {
      // the given style is out of date, so we don't add it to CT
      return null;
    }
    // the given style is up-to-date and an earlier version of it is already
    // stored in CT, so we just need to update its attributes
    const categories = await createOrUpdateCategoriesFromStyle(style, ctHelpers);
    return updateStyle({ style, existingCtStyle, productType, categories, ctHelpers });
};

module.exports = {
  createStyle,
  createAndPublishStyle,
  updateStyle,
  updateCategory,
  createOrUpdateStyle,
  existingCtStyleIsNewer,
  getActionsFromStyle,
  getCtStyleAttributeValue,
  getCtStyleAttribute,
  getProductType,
  getExistingCtStyle,
  getCategory,
  createOrUpdateCategoriesFromStyle,
  getUniqueCategoryIdsFromCategories,
  createCategory,
  categoryKeyFromNames,
  createPriceUpdate,
  categoryNeedsUpdating
};
