const attributeMap = {
  'ID': 'id',
  'STYLEID': 'styleId',
  'COLORID': 'colorId',
  'SIZEID': 'sizeId',
  'SIZE': 'size',
  'DIMENSION': 'dimensionId',
  'LASTMODIFIEDDATE': 'skuLastModifiedInternal'
};

const parseSkuMessageCt = message => Object.keys(message.value).reduce((parsedMessage, attribute) => {
  if (!Object.prototype.hasOwnProperty.call(attributeMap, attribute)) return parsedMessage;

  if (attribute === 'SIZE') {
    return {
      ...parsedMessage,
      size: {
         // CT throws an error if you try to add a language key whose value is
         // `null`, so we set the value to an empty string by default (which CT
         // is OK with)
        'en-CA': message.value.SIZE_EN || message.value.SIZE || '', // in JESTA, the translation table is missing some values for English sizes, so we fall back to the SIZE value (which is always English)
        'fr-CA': message.value.SIZE_FR || ''
      }
    };
  }

  if (attribute === 'LASTMODIFIEDDATE') {
    return {
      ...parsedMessage,
      [attributeMap.LASTMODIFIEDDATE]: new Date(message.value[attribute]) // convert Unix time integer to a JS date object
    };
  }

  if (attribute === 'SIZEID') {
    return {
      ...parsedMessage,
      [attributeMap.SIZEID]: message.value.SIZEID.toString() // CT expects the sizeId to be a string, and will throw an error if you give it a number
    };
  }

  return {
    ...parsedMessage,
    [attributeMap[attribute]]: message.value[attribute]
  };
}, {});

module.exports = parseSkuMessageCt;
