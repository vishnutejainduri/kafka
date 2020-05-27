const { parseStyleBasicMessage } = require('./parseStyleBasicMessage');

const formatDates = message => {
  if (message.lastModifiedDate !== undefined && message.lastModifiedDate !== null) {
    return {
      ...message,
      styleOutletLastModifiedInternal: new Date(message.lastModifiedDate)
    };
  }
  return message;
};

const parseStyleBasicMessageCt = message => formatDates(parseStyleBasicMessage(message));

module.exports = {
    parseStyleBasicMessageCt
};
