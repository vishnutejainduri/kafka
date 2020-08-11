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

const CT_FILE_SUFFIX_PROD = '_CT_PROD.csv';
const CT_FILE_SUFFIX_DEV = '_CT_DEV.csv';
const CT_FILE_SUFFIX_STAGE = '_CT_STAGE.csv';
const CT_DATA_PATH = './ctData/';

const BARCODE_TYPE = 'barcodes';
const SKU_TYPE = 'skus';
const STYLES_BASIC_TYPE = 'stylesbasic';

const checkIfMissingAllVariants = (result) => result.masterData.current.variants.map(currentVariant => currentVariant.sku).length === 0

const getBarcodeData = async (client, requestBuilder, result) => {
  let variantBarcodes;
  if (!result.masterData.current.variants) variantBarcodes = []

  variantBarcodes = await Promise.all(result.masterData.current.variants.map(async variant => {
    let barcodes = variant.attributes.find(attribute => attribute.name === 'barcodes');
    if (!barcodes) return null;
    barcodes = await Promise.all(barcodes.value.map(async barcode => {
      const method = 'GET';
      const uri = `${requestBuilder.customObjects.build()}/barcodes/${barcode.id}`;

      try {
        const response = await client.execute({ method, uri }); 
        return response.body.key;
      } catch (err) {
        return `ERROR-${barcode.id},${result.key},${variant.sku}`;
      }
    }))
    return barcodes;
  }))

  variantBarcodes = variantBarcodes.filter(Boolean)
  return variantBarcodes.reduce((totalBarcodes, variantBarcodes) => [ ...totalBarcodes, ...variantBarcodes ], []).filter(Boolean);
}

const findMissingDataFromJesta = async (ctData, jestaData) => {
  console.log(`searching for jesta data...`);
  return Promise.all(jestaData.map(async currentJestaData => {
    return ctData.includes(currentJestaData)
      ? null
      : currentJestaData
  }))
}

const getFileNamings = (environment, all = false) => {
  let JESTA_FILE_SUFFIX, MISSING_DATA_SUFFIX, CT_FILE_SUFFIX
  if (environment === 'dev' || environment === 'development') {
    JESTA_FILE_SUFFIX = JESTA_FILE_SUFFIX_DEV;
    CT_FILE_SUFFIX = CT_FILE_SUFFIX_DEV;
    MISSING_DATA_SUFFIX = all
      ? MISSING_ALL_DATA_SUFFIX_DEV
      : MISSING_DATA_SUFFIX_DEV
  }
  if (environment === 'staging' || environment === 'stage') {
    JESTA_FILE_SUFFIX = JESTA_FILE_SUFFIX_STAGE
    CT_FILE_SUFFIX = CT_FILE_SUFFIX_STAGE;
    MISSING_DATA_SUFFIX = all
      ? MISSING_ALL_DATA_SUFFIX_STAGE
      : MISSING_DATA_SUFFIX_STAGE
  }
  if (environment === 'production' || environment === 'prod') {
    JESTA_FILE_SUFFIX = JESTA_FILE_SUFFIX_PROD
    CT_FILE_SUFFIX = CT_FILE_SUFFIX_PROD;
    MISSING_DATA_SUFFIX = all
      ? MISSING_ALL_DATA_SUFFIX_PROD
      : MISSING_DATA_SUFFIX_PROD
  }
  return { JESTA_FILE_SUFFIX, MISSING_DATA_SUFFIX, CT_FILE_SUFFIX }
}

const compareMissingWithJesta = async ({ client, requestBuilder }, environment, { findMissingVariants, findMissingBarcodes, findMissingStylesBasic, checkIfMissingAllVariants }) => {
  let searchForAllMissing = false;
  if (checkIfMissingAllVariants)  searchForAllMissing = true

  const { MISSING_DATA_SUFFIX, JESTA_FILE_SUFFIX, CT_FILE_SUFFIX } = getFileNamings (environment, searchForAllMissing);

  const wstreams = {}
  if (checkIfMissingAllVariants)  wstreams[SKU_TYPE] = fs.createWriteStream(MISSING_ALL_DATA_PREFIX + SKU_TYPE + MISSING_DATA_SUFFIX);
  if (findMissingVariants)  {
    wstreams[SKU_TYPE] = fs.createWriteStream(MISSING_DATA_PREFIX + SKU_TYPE + MISSING_DATA_SUFFIX);
    wstreams[`CT${SKU_TYPE}`] = fs.createWriteStream(CT_DATA_PATH + SKU_TYPE + CT_FILE_SUFFIX);
  }
  if (findMissingBarcodes) {
    wstreams[BARCODE_TYPE] = fs.createWriteStream(MISSING_DATA_PREFIX + BARCODE_TYPE + MISSING_DATA_SUFFIX);
    wstreams[`CT${BARCODE_TYPE}`] = fs.createWriteStream(CT_DATA_PATH + BARCODE_TYPE + CT_FILE_SUFFIX);
  }
  if (findMissingStylesBasic) {
    wstreams[STYLES_BASIC_TYPE] = fs.createWriteStream(MISSING_DATA_PREFIX + STYLES_BASIC_TYPE + MISSING_DATA_SUFFIX);
    wstreams[`CT${STYLES_BASIC_TYPE}`] = fs.createWriteStream(CT_DATA_PATH + STYLES_BASIC_TYPE + CT_FILE_SUFFIX);
  }

  const jestaData = {}
  if (findMissingVariants)  jestaData[SKU_TYPE] = (await readFile (JESTA_DATA_PATH + SKU_TYPE + JESTA_FILE_SUFFIX, 'utf-8')).split('\n')
  if (findMissingBarcodes)  jestaData[BARCODE_TYPE] = (await readFile (JESTA_DATA_PATH + BARCODE_TYPE + JESTA_FILE_SUFFIX, 'utf-8')).split('\n')
  if (findMissingStylesBasic)  jestaData[STYLES_BASIC_TYPE] = (await readFile (JESTA_DATA_PATH + STYLES_BASIC_TYPE + JESTA_FILE_SUFFIX, 'utf-8')).split('\n')

  const method = 'GET';

  let productTotal = 0;
  let totalProductsMissingAllVariants = 0;

  let missingVariantsTotal = 0;
  let missingBarcodesTotal = 0;
  let missingStylesBasicTotal = 0;

  let variants = [];
  let barcodes = [];
  let stylesBasics = [];

  let missingVariants, missingBarcodes, missingStylesBasic

  let lastId = null;
  const STOP_COUNT = 500;
  let resultCount = STOP_COUNT;
  
  while (resultCount === STOP_COUNT) {
    let uri;
    if (!lastId) {
      uri = requestBuilder.products.withTotal(false).perPage(STOP_COUNT).sort('id').build();
    } else {
      uri = requestBuilder.products.withTotal(false).perPage(STOP_COUNT).sort('id').where(`id > "${lastId}"`).build();
    }

    try {
      const response = await client.execute({ method, uri });

      resultCount = response.body.count;
      productTotal += resultCount;
      console.log('Total Products: ', productTotal);

      const results = response.body.results;
      await Promise.all(results.map (async (result) => {
        if (checkIfMissingAllVariants) {
          if (checkIfMissingAllVariants(result)) {
            wstreams[SKU_TYPE].write(result.id + '\n')
            totalProductsMissingAllVariants += 1
          }
        }
        if (findMissingVariants) {
          variants = variants.concat(result.masterData.current.variants.map(currentVariant => currentVariant.sku))
        }
        if (findMissingBarcodes) {
          const barcodeData = await getBarcodeData(client, requestBuilder, result)
          barcodes = barcodes.concat(barcodeData)
        }
        if (findMissingStylesBasic) {
          stylesBasics.push(result.masterData.current.masterVariant.attributes.filter(attribute => attribute.name === 'isOutlet').length > 0
            ? result.key
            : null
          )
        }
      }))

      lastId = results[results.length-1].id;
    } catch (err) {
        if (err.code === 404) return null;
        throw err;
    }
  }
  console.log('found all products');

  const jestaCompareResults = [];

  if (findMissingVariants) {
    console.log('writing CT skus...');
    wstreams[`CT${SKU_TYPE}`].cork();
    variants.forEach (variant => wstreams[`CT${SKU_TYPE}`].write(variant + '\n'))
    wstreams[`CT${SKU_TYPE}`].uncork();

    //jestaCompareResults.push(findMissingDataFromJesta (variants, jestaData[SKU_TYPE]))
    //console.log(jestaCompareResults);
    /*missingVariantsTotal += missingVariants.length
    missingVariants.forEach (variant => wstreams[SKU_TYPE].write(variant + '\n'))*/
  }
  if (findMissingBarcodes) {
    console.log('writing CT barcodes...');
    wstreams[`CT${BARCODE_TYPE}`].cork();
    barcodes.forEach (barcode => wstreams[`CT${BARCODE_TYPE}`].write(barcode + '\n'))
    wstreams[`CT${BARCODE_TYPE}`].uncork();

    //jestaCompareResults[BARCODE_TYPE] = findMissingDataFromJesta (barcodes, jestaData[BARCODE_TYPE])
    /*missingBarcodesTotal += missingBarcodes.length
    missingBarcodes.forEach (barcode => wstreams[BARCODE_TYPE].write(barcode + '\n'))*/
  }
  if (findMissingStylesBasic) {
    console.log('writing CT styles basic...');
    wstreams[`CT${STYLES_BASIC_TYPE}`].cork();
    stylesBasics.forEach (stylesBasic => wstreams[`CT${STYLES_BASIC_TYPE}`].write(stylesBasic + '\n'))
    wstreams[`CT${STYLES_BASIC_TYPE}`].uncork();

    //jestaCompareResults[STYLES_BASIC_TYPE] = findMissingDataFromJesta (stylesBasic, jestaData[STYLES_BASIC_TYPE])
    /*missingStylesBasicTotal += missingStylesBasic.length
    missingStylesBasic.forEach (stylebasic => wstreams[STYLES_BASIC_TYPE].write(stylebasic + '\n'))*/
  }

  //await Promise.all(Object.values(jestaCompareResults))

  console.log('FINISH');

  return {
    missingVariantsTotal,
    missingBarcodesTotal,
    missingStylesBasicTotal,
    totalProductsMissingAllVariants
  };
}

const getAllMissingSkus = (ctHelpers, environment) => compareMissingWithJesta(ctHelpers, environment, { findMissingVariants: true });
const getAllMissingBarcodes = (ctHelpers, environment) => compareMissingWithJesta(ctHelpers, environment, { findMissingBarcodes: true });
const getAllMissingStylesBasic = (ctHelpers, environment) => compareMissingWithJesta(ctHelpers, environment, { findMissingStylesBasic: true });
const getAllMissing = (ctHelpers, environment) => compareMissingWithJesta(ctHelpers, environment, { findMissingVariants: true, findMissingBarcodes: true, findMissingStylesBasic: true });
const getAllProductsMissingAllData = (ctHelpers, environment) => compareMissingWithJesta(ctHelpers, environment, { checkIfMissingAllVariants: checkIfMissingAllVariants })

module.exports = {
  getAllMissing,
  getAllMissingSkus,
  getAllMissingBarcodes,
  getAllMissingStylesBasic,
  getAllProductsMissingAllData
}
