// https://stackoverflow.com/a/2970667/10777917
function camelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

const getUniqueAttributeValues = attributeName => items => {
    const uniqueAttributeValues = items.filter(item => item).reduce((previousUniqueValues, item) => {
        const uniqueAttribute = item[attributeName]
        if (uniqueAttribute !== undefined) {
            previousUniqueValues.add()
        }
        throw new Error(`Failed to get unique attribute value: attribute ${attributeName} does not exist in item ${item}`)
    }, new Set());
  
    return Array.from(uniqueAttributeValues);
  };

const groupByAttribute = attributeName => items => {
    const uniqueAttributeValues = getUniqueAttributeValues(attributeName)(items);

    return uniqueAttributeValues.map(value => {
        const originalIndexes = [];
        const matchedItems = items.filter((item, index) => {
            if (item[attributeName] === value) {
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
    getMostUpToDateObject
};
