# Find Missing Data
## Setup
To use the findMissingData script start by installing node modules (the usual way):

```
npm install
```

Setup your `.env` file and make sure it contains the following (there should be a set for each environment you want, example is for development where keys should end with DEVELOPMENT):

```
PROJECT_KEY_DEVELOPMENT='harryrosen-development'
CLIENT_ID_DEVELOPMENT='clientIdDevelopment'
CLIENT_SECRET_DEVELOPMENT='clientSecretDevelopment'
```

## Execution
Start with `node ./findMissingData.js` and pass in up to three arguments, the first is the environment name e.g. `development` and the second argument is the entity type e.g. `variants`, `barcodes`, `stylesbasic`, or `all`. Passing `all` as the data type will count everything in one command.
You can also pass in `missingall`, this will find all products missing all of their data (no comparison with JESTA).
A third arguement can be passed in (optional). If `test` is sent, a quick test run of the script is done on only the first 500 products in CT. The script takes a long time to run so this is useful for quick verification.

The script will take a very long while to run (on roughly 150k products for skus, 3hrs+), but will log out the current product count it's at as it goes (to help you know how far along it is, compare with total products in Merchant Center). It will also output all the CT data it is about to compare to JESTA right before starting the diff.
When finished it will log out the following (varies based on data type): 
