/**
 * This module facilitates calling the product API.
 */

function productApiRequest(openwhiskParams, params = {}, postData) {
    if (!openwhiskParams.productApiClientId || !openwhiskParams.productApiHost) {
        throw new Error('productApiClientId and productApiHost are required action params. See manifest.yaml.')
    }

    params.headers = Object.assign({}, params.headers, {
        'X-IBM-Client-Id': openwhiskParams.productApiClientId,
        accept: 'application/json'
    });
    params.host = openwhiskParams.productApiHost;

    return new Promise(function(resolve, reject) {
        var req = http.request(params, function(res) {
            // reject on bad status
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('statusCode=' + res.statusCode));
            }
            // cumulate data
            var body = [];
            res.on('data', function(chunk) {
                body.push(chunk);
            });
            // resolve on end
            res.on('end', function() {
                try {
                    body = JSON.parse(Buffer.concat(body).toString());
                } catch(e) {
                    reject(e);
                }
                resolve(body);
            });
        });
        // reject on request error
        req.on('error', function(err) {
            // This is not a "Second reject", just a different sort of failure
            reject(err);
        });
        if (postData) {
            req.write(postData);
        }
        // IMPORTANT
        req.end();
    });
}

module.exports = {
    productApiRequest
};
