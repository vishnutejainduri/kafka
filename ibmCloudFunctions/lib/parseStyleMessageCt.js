const { parseStyleMessage } = require('./parseStyleMessage');

// Helper function for `formatLanguageKeys`. Returns true iff given object of
// the form {fr: 'foo', en: 'bar'}. Order of the keys doesn't matter.
const isLocalizedString = value => (
  typeof value === 'object' &&
  typeof value.fr === 'string' &&
  typeof value.en === 'string' &&
  (Object.keys(value).length === 2)
);

const formatLanguageKeys = message => (
  Object.keys(message).reduce((newMessage, property) => {
    if (isLocalizedString(message[property])) {
      return {
        ...newMessage,
        [property]: {
          // CT throws an error if you give it a language string set to `null`,
          // so we set all falsy language values to an empty string (which CT
          // accepts without issue).
          'en-CA': message[property].en || '',
          'fr-CA': message[property].fr || ''
        }
      }
    }
    return { ...newMessage, [property]: message[property] };
  }, {})
);

// Dates that we get from Kafka are in Unix time (possibly shifted to ET?).
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

module.exports = {
  parseStyleMessageCt,
  formatLanguageKeys
};
