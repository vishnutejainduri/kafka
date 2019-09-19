const { productApiRequest } = require('../../lib/productApi');

global.main = async function (params) {
  const response = {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { msg: 'Success' }
  };

  const apiStatusChecks = [];
  apiStatusChecks.push(productApiRequest(params, `/style`));
  apiStatusChecks.push(productApiRequest(params, `/sku`));
  apiStatusChecks.push(productApiRequest(params, `/inventory`));

  return Promise.all(apiStatusChecks)
    .then((results) => {
      const invalidCount = results.filter((result) => result.data.length <= 0).length;
      if (invalidCount === 0) {
        return response;
      } else {
        response.statusCode = 500;
        response.body.msg = 'Missing critical data'
        return response;
      }
    })
    .catch((error) => {
      response.statusCode = 500;
      response.body.msg = error;
      return response;
    })
}

module.exports = global.main;
