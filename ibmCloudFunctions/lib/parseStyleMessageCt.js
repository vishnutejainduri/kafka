const { parseStyleMessage } = require('./parseStyleMessage');

const languageKeyMap = {
  en: 'en-CA',
  fr: 'fr-CA'
};

// CT expects language keys to include a locale (for example, the key for
// Canadian English is 'en-CA', not 'en'). The messages that
// `parseMessageStyle` returns have non-localized language keys. This function
// replaces the non-localized language keys in a message with localized ones.
const formatLanguageKeys = item => {
  if (!item) return item;
  if (typeof item !== 'object') return item;
  const keys = Object.keys(item);
  if (keys.length === 0) return item;

  return keys.reduce((newObject, key) => {
      if (key !== 'en' && key !== 'fr') {
          return {...newObject, [key]: formatLanguageKeys(item[key])};
      }
      // CT throws an error if you give it a language string set to `null`,
      // so we set all falsy language values to an empty string (which CT
      // accepts without issue).
      return {...newObject, [languageKeyMap[key]]: formatLanguageKeys(item[key]) || ''};
  }, {});
};

// Dates in JESTA are stored as the number of milliseconds since the epoch.
// This function standardizes the format of the dates and sets the key to the
// corresponding attribute in CT.
const formatDates = message => ({
  ...message,
  styleLastModifiedInternal: new Date(message.lastModifiedDate)
});

// When parsing style messages for updating CT, we rely mostly on
// `parseMessageStyle`, which is also used when adding styles to MongoDB. But
// there are some small CT-specific changes to do with dates and language keys
// that we need to make.
const parseStyleMessageCt = message => formatDates(formatLanguageKeys(parseStyleMessage(message)));

module.exports = parseStyleMessageCt;
