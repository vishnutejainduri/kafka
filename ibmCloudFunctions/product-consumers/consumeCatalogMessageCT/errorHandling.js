// Based on the error handling code in `/product-consumers/consumeCatalogMessage/index.js`
const passDownAnyMessageErrors = messages => {
  console.log('DONE PROCESSING, here are the messages:', messages);
  const errors = messages.filter(result => result instanceof Error);
  const successes = messages.filter(result => !(result instanceof Error));


  if (errors.length > 0) {
    const err = new Error(`${errors.length} of ${errors.length} updates failed. See 'failedUpdatesErrors'.`);
    err.failedUpdatesErrors = errors;
    err.successfulUpdatesResults = successes;
    throw err;
  }
};

const handleErrors = err => {
  console.log('TODO');
  console.log(err);
};

module.exports = {
  passDownAnyMessageErrors,
  handleErrors
};
