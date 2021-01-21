const { KEY_VALUE_DOCUMENT } = require('../commercetools/constantsCt');

const removeDuplicateIds = keyValueDocumentReferences => {
    const ids = keyValueDocumentReferences.map(({ id }) => id);
    const uniqueIds = Array.from(new Set(ids));
    const uniqueKeyValueDocumentReferences = uniqueIds.map(id => ({ id, typeId: KEY_VALUE_DOCUMENT }));
    return uniqueKeyValueDocumentReferences;
};


// https://stackoverflow.com/a/2970667/10777917
function camelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

const getAttributePathValue = attributePath => item => {
  return Array.isArray(attributePath) ? attributePath.reduce((previous, current) => previous[current], item) : item[attributePath]
}

const getUniqueAttributeValues = attributePath => items => {
    const uniqueAttributeValues = items.filter(item => item).reduce((previousUniqueValues, item) => {
        const uniqueAttribute = getAttributePathValue(attributePath)(item)
        if (uniqueAttribute !== undefined) {
            previousUniqueValues.add(uniqueAttribute)
        } else {
            throw new Error(`Failed to get unique attribute value: attribute ${attributePath} does not exist in item ${JSON.stringify(item)}`)
        }
        return previousUniqueValues
    }, new Set());
  
    return Array.from(uniqueAttributeValues);
  };

const groupByAttribute = attributePath => items => {
    // Since items are return by addErrorHandling, they might an instance of Error, which cannot be processed; we treat those as nulls here
    // We are using map instead of here, because we want to preserve the indexes as returned by originalIndexes and as observed in the params.messages
    items = items.map(item => item instanceof Error ? null : item)
    const uniqueAttributeValues = getUniqueAttributeValues(attributePath)(items);

    return uniqueAttributeValues.map(value => {
        const originalIndexes = [];
        const matchedItems = items.filter((item, index) => {
            if (item && getAttributePathValue(attributePath)(item) === value) {
                originalIndexes.push(index)
                return true
            }
        });
        matchedItems.originalIndexes = originalIndexes;
        return matchedItems;
    });
};

const getMostUpToDateObject = dateName => objects => {
    if (objects.length === 0) return null;
    const objectsSortedByDate = objects.sort((object1, object2) => (
        object2[dateName] - object1[dateName]
      ));

    return objectsSortedByDate[0];
};

module.exports = {
    camelCase,
    groupByAttribute,
    getMostUpToDateObject,
    removeDuplicateIds
};
