const { getCtHelpers } = require('./client.js');
const { 
  runProductImport
} = require('./runCTQuery.js');

async function main() {  
  const userInput = process.argv.slice(2);
  const environment = userInput[0];
  const dataType = userInput[1];

  if (environment !== 'dev' && environment !== 'development' && environment !== 'staging' && environment !== 'production' && environment !== 'prod') {
    console.log ('Invalid environment provided');
    return;
  }

  const { token, projectKey } = await getCtHelpers (environment)
  switch (dataType) {
    case 'productimport':
      runProductImport(token, projectKey)
        .then(result => console.log('Total result: ', result))
        .catch(e => console.log(e));
      break;
    default:
      console.log ('Invalid data type provided');
  };
}

(async () => {
    await main();
})().catch(e => {
  console.error(e);
});
