// https://stackoverflow.com/a/2970667/10777917
function camelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

const getUniqueAttributeValues = attributeName => items => {
    const uniqueAttributeValues = items.reduce((previousUniqueValues, item) => (
      previousUniqueValues.add(item[attributeName])
    ), new Set());
  
    return Array.from(uniqueAttributeValues);
  };
  
const groupByAttribute = attributeName => items => {
    const uniqueAttributeValues = getUniqueAttributeValues(attributeName)(items);

    return uniqueAttributeValues.map(value => (
        items.filter(item => item[attributeName] === value)
    ));
};

module.exports = {
    camelCase,
    groupByAttribute
};