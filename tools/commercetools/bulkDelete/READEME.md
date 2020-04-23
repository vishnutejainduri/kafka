To use the scripts in `resourceDeleter.sh`, first install the commercetools [Resource Deleter](https://commercetools.github.io/nodejs/cli/resource-deleter.html) npm module:

```
npm install @commercetools/resource-deleter --global
```

Then set or update the values of `ACCESS_TOKEN` and `PROJECT_KEY` in `resourceDeleter.sh`. `PROJECT_KEY` should `harryrosen-dev`, or `harryrosen-staging`, or whatever.

commercetools claims that the Resource Deleter can be used either though the CLI or as a normal JavaScript module, though I was able to get it working only through the command line.

By default, logs are saved to `resources-deleted-report.log` after the script finishes running.

`resourceDeleter.sh` contains scripts to:
- delete all products (including SKUs)
- delete all custom objects (use this to delete barcodes)
- delete all categories

There's not currently a script to delete all SKUs without also deleting all styles.
