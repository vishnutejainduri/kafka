const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const MISSING_DATA_PREFIX = './results/missingData_';
const MISSING_DATA_SUFFIX_PROD = '_PROD.csv';
const MISSING_DATA_SUFFIX_DEV = '_DEV.csv';
const MISSING_DATA_SUFFIX_STAGE = '_STAGE.csv';

const MISSING_ALL_DATA_PREFIX = './results/missingAllData_';
const MISSING_ALL_DATA_SUFFIX_PROD = '_PROD.csv';
const MISSING_ALL_DATA_SUFFIX_DEV = '_DEV.csv';
const MISSING_ALL_DATA_SUFFIX_STAGE = '_STAGE.csv';

const JESTA_FILE_SUFFIX_PROD = '_JESTA_PROD.csv';
const JESTA_FILE_SUFFIX_DEV = '_JESTA_TEST.csv';
const JESTA_FILE_SUFFIX_STAGE = '_JESTA_TEST.csv';
const JESTA_DATA_PATH = './jestaData/';

const BARCODE_TYPE = 'barcodes';
const SKU_TYPE = 'skus';
const STYLES_BASIC_TYPE = 'stylesbasic';

const checkIfMissingAllVariants = (result) => result.masterData.current.variants.map(currentVariant => currentVariant.sku).length === 0

const getBarcodeData = (client, requestBuilder, result) => {
  const variantBarcodes = result.masterData.current.variants.map(variant => {
    let barcodes = variant.find(attribute => attribute.name === 'barcodes').value
    barcodes = barcodes.map(barcode => {
      const method = 'GET';
      const uri = `${requestBuilder.customObjects.build()}/barcodes/${barcode.id}`;

      try {
        const response = await client.execute({ method, uri }); 
        return response.body.key;
      } catch (err) {
        return `ERROR${barcode.id}`;
      }
    })
    return barcodes;
  })
  return variantBarcodes.reduce((totalBarcodes, variantBarcodes) => [ ...totalBarcodes, ...variantBarcodes ], []).filter(Boolean);
}

const findMissingDataFromJesta = (ctData, jestaData) => {
  return jestaData.map(currentJestaData => {
    console.log('searching for...', currentJestaData);
    return ctData.includes(currentJestaData)
      ? null
      : currentJestaData
  }).filter(Boolean);
}

const getFileNamings = (environment, all = false) => {
  let JESTA_FILE_SUFFIX, MISSING_DATA_SUFFIX
  if (environment === 'dev' || environment === 'development') {
    JESTA_FILE_SUFFIX = JESTA_FILE_SUFFIX_DEV;
    MISSING_DATA_SUFFIX = all
      ? MISSING_ALL_DATA_SUFFIX_DEV
      : MISSING_DATA_SUFFIX_DEV
  }
  if (environment === 'staging' || environment === 'stage') {
    JESTA_FILE_SUFFIX = JESTA_FILE_SUFFIX_STAGE
    MISSING_DATA_SUFFIX = all
      ? MISSING_ALL_DATA_SUFFIX_STAGE
      : MISSING_DATA_SUFFIX_STAGE
  }
  if (environment === 'production' || environment === 'prod') {
    JESTA_FILE_SUFFIX = JESTA_FILE_SUFFIX_PROD
    MISSING_DATA_SUFFIX = all
      ? MISSING_ALL_DATA_SUFFIX_PROD
      : MISSING_DATA_SUFFIX_PROD
  }
  return { JESTA_FILE_SUFFIX, MISSING_DATA_SUFFIX }
}

const compareMissingWithJesta = async ({ client, requestBuilder }, environment, { findMissingVariants, findMissingBarcodes, findMissingStylesBasic }) => {
  const { MISSING_DATA_SUFFIX, JESTA_FILE_SUFFIX } = getFileNamings (environment);

  const wstreams = {}
  if (findMissingVariants)  wstreams[SKU_TYPE] = fs.createWriteStream(MISSING_DATA_PREFIX + SKU_TYPE + MISSING_DATA_SUFFIX);
  if (findMissingBarcodes)  wstreams[BARCODE_TYPE] = fs.createWriteStream(MISSING_DATA_PREFIX + BARCODE_TYPE + MISSING_DATA_SUFFIX);
  if (findMissingStylesBasic)  wstreams[STYLES_BASIC_TYPE] = fs.createWriteStream(MISSING_DATA_PREFIX + STYLES_BASIC_TYPE + MISSING_DATA_SUFFIX);

  const jestaData = {}
  if (findMissingVariants)  jestaData[SKU_TYPE] = (await readFile (JESTA_DATA_PATH + SKU_TYPE + JESTA_FILE_SUFFIX, 'utf-8')).split('\n')
  if (findMissingBarcodes)  jestaData[BARCODE_TYPE] = (await readFile (JESTA_DATA_PATH + BARCODE_TYPE + JESTA_FILE_SUFFIX, 'utf-8')).split('\n')
  if (findMissingStylesBasic)  jestaData[STYLES_BASIC_TYPE] = (await readFile (JESTA_DATA_PATH + STYLES_BASIC_TYPE + JESTA_FILE_SUFFIX, 'utf-8')).split('\n')

  const method = 'GET';

  let productTotal = 0;

  let missingVariantsTotal = 0;
  let missingBarcodesTotal = 0;
  let missingStylesBasicTotal = 0;

  let variants = [];
  let barcodes = [];
  let stylesBasic = [];

  let missingVariants, missingBarcodes, missingStylesBasic

  let lastId = null;
  let resultCount = 500;
  
  while (resultCount === 500) {
    let uri;
    if (!lastId) {
      uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').build();
    } else {
      uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').where(`id > "${lastId}"`).build();
    }

    try {
      const response = await client.execute({ method, uri });

      resultCount = response.body.count;
      productTotal += resultCount;
      console.log('Total Products: ', productTotal);

      const results = response.body.results;
      results.forEach ((result) => {
        if (findMissingVariants) {
          variants = variants.concat(result.masterData.current.variants.map(currentVariant => currentVariant.sku))
        }
        if (findMissingBarcodes) {
          barcodes = barcodes.concat(getBarcodeData(client, requestBuilder, result))  
        }
        if (findMissingStylesBasic) {
          stylesBasic.push(result.masterData.current.masterVariant.attributes.filter(attribute => attribute.name === 'isOutlet').length > 0
            ? result.key
            : null
          )
        }
      });

      lastId = results[results.length-1].id;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }

  if (findMissingVariants) {
    missingVariants = findMissingDataFromJesta (variants, jestaData[SKU_TYPE])
    missingVariantsTotal += missingVariants.length
    missingVariants.forEach (variant => wstreams[SKU_TYPE].write(variant + '\n'))
  }
  if (findMissingBarcodes) {
    missingBarcodes = findMissingDataFromJesta (barcodes, jestaData[BARCODE_TYPE])
    missingBarcodesTotal += missingBarcodes.length
    missingBarcodes.forEach (barcode => wstreams[BARCODE_TYPE].write(barcode + '\n'))
  }
  if (findMissingStylesBasic) {
    missingStylesBasic = findMissingDataFromJesta (stylesBasic, jestaData[STYLES_BASIC_TYPE])
    missingStylesBasicTotal += missingStylesBasic.length
    missingStylesBasic.forEach (stylebasic => wstreams[STYLES_BASIC_TYPE].write(stylebasic + '\n'))
  }

  return {
    missingVariantsTotal,
    missingBarcodesTotal,
    missingStylesBasicTotal
  };
}

const findProductsMissingData = async ({ client, requestBuilder }, environment, { checkIfMissingAllVariants: checkIfMissingAllVariants }) => {
  const { MISSING_DATA_SUFFIX, JESTA_FILE_SUFFIX } = getFileNamings (environment, true);

  const wstreams = {}
  if (checkIfMissingAllVariants)  wstreams[SKU_TYPE] = fs.createWriteStream(MISSING_ALL_DATA_PREFIX + SKU_TYPE + MISSING_DATA_SUFFIX);

  const method = 'GET';

  let productTotal = 0;
  let totalProductsMissingAllVariants = 0;

  let lastId = null;
  let resultCount = 500;
  
  while (resultCount === 500) {
    let uri;
    if (!lastId) {
      uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').build();
    } else {
      uri = requestBuilder.products.withTotal(false).perPage(500).sort('id').where(`id > "${lastId}"`).build();
    }

    try {
      const response = await client.execute({ method, uri });

      resultCount = response.body.count;
      productTotal += resultCount;
      console.log('Total Products: ', productTotal);

      const results = response.body.results;
      results.forEach ((result) => {
        if (checkIfMissingAllVariants) {
          if (checkIfMissingAllVariants(result)) {
            wstreams[SKU_TYPE].write(result.id + '\n')
            totalProductsMissingAllVariants += 1
          }
        }
      });

      lastId = results[results.length-1].id;
      console.log(totalProductsMissingAllVariants);
      //if (totalProductsMissingAllVariants > 0) break;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }

  return {
    totalProductsMissingAllVariants
  }
}

const getAllMissing = (ctHelpers, environment) => compareMissingWithJesta(ctHelpers, environment, { findMissingVariants: true, findMissingBarcodes: true, findMissingStylesBasic: true });
const getAllProductsMissingAllData = (ctHelpers, environment) => findProductsMissingData(ctHelpers, environment, { checkIfMissingAllVariants: checkIfMissingAllVariants })

module.exports = {
  getAllMissing,
  getAllProductsMissingAllData
}
