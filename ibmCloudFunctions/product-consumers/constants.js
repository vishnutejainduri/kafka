// The initial status of a price change is 'false';
// once it goes through updateAlgoliaPrice, if it is processed, it'll be 'true'
// and if processing it causes an errorm it'll be 'failure'
const priceChangeProcessStatus = {
    false: 'false',
    true: 'true',
    failure: 'failure'
}

module.exports = {
    COMPOSER_RETRIES: 1,
    MAX_BYTE_RESPONSE: 5242880, // OpenWhisk limitation
    priceChangeProcessStatus
};
