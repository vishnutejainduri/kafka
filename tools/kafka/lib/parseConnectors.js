const https = require('https');

module.exports = function(kubeHost, token) {
    const options = {
        hostname: kubeHost.replace('https://', ''),
        port: 443,
        path: `/connectors`,
        method: 'GET',
        headers: {
            Authorization: `${token.token_type} ${token.access_token}`
        }
    };

    return new Promise(function(resolve, reject) {
        const request = https.request(options, function(res){
            let body = "";
            res.on('data', function(data) {
               body += data;
            });
            res.on('end', function() {
                //here we have the full response, html or json object
                resolve(JSON.parse(body));
            })
            res.on('error', function(e) {
                reject(e);
            });
        });

        request.end();
    });
}
