/**
 * This module facilitates calling the product API.
 */
const request = require('request');

function productApiRequest(params, uri) {
    if (!params.productApiClientId || !params.productApiHost) {
        throw new Error('productApiClientId and productApiHost are required action params. See manifest.yaml.')
    }

    const productApiParams = {
        baseUrl: params.productApiClientId,
        uri,
        headers: {
            'X-IBM-Client-Id': params.productApiClientId,
            accept: 'application/json'
        },
        json: true
    };

    return request(productApiParams);
}

module.exports = {
    productApiRequest
};
