To use the partial deletion script start by installing node modules (the usual way):

```
npm install
```

Setup your `.env` file, make sure it contains the following (for each environment you want, example is for development):

```
PROJECT_KEY_DEVELOPMENT='harryrosen-development'
CLIENT_ID_DEVELOPMENT='clientIdDevelopment'
CLIENT_SECRET_DEVELOPMENT='clientSecretDevelopment'
```

Run the script. Start with `node partialDelete.js` then pass in two arguments, first environment name like `development` then data type to delete like `prices`.
Currently supported commands:
- `node partialDelete.js development prices`

The script will take a while to run (on roughly 150k products, over 15mins), but will log out the current product count it's at as it goes (to help you know how far along it is, compare with total products in Merchant Center).
When finished it will log out the following: 
- `productTotal`: total number of products where data was deleted
- `totalSuccess`: total number of successful deletions
- `totalFailures`: total number of failed deletions or other errors of any kind

If `totalFailures` is greater than 0, then those errors will be logged into a file outputted by the script, `errors.csv`.
Inside `errors.csv` is just two columns, the first column is the style id that failed the second is the error that caused it to fail.
This file is purely to help with debugging.
