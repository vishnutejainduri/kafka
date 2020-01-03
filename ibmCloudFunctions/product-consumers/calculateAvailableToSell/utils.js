const handleStyleAtsUpdate = (
    ats,
    atsData,
    threshold
) => {
        const skuAts = ats.filter((atsRecord) => atsRecord.skuId === atsData.skuId)[0];
        const shouldUpdateAts = (skuAts && atsData.availableToSell >= 0) || (!skuAts && atsData.availableToSell > 0)
                                
        const originalAtsRecords = ats.filter((atsRecord) => !(atsRecord.skuId === atsData.skuId))

        if (shouldUpdateAts) {
          const originalSkuAts = skuAts
                                 ? skuAts.ats.filter((atsValue) => !(atsValue.storeId === atsData.storeId))
                                 : null
          if (originalSkuAts && !(atsData.availableToSell > 0) && originalSkuAts.length === 0) {
            return originalAtsRecords;
          }
          const newAtsRecord = {
              skuId: atsData.skuId,
              threshold: threshold,
              ats: !skuAts 
                  ? [{
                      storeId: atsData.storeId,
                      availableToSell: atsData.availableToSell
                    }]
                  : atsData.availableToSell > 0 ? originalSkuAts.concat({ storeId: atsData.storeId, availableToSell: atsData.availableToSell }) : originalSkuAts
            };
            return originalAtsRecords.concat(newAtsRecord);
        }
        return originalAtsRecords;
      }

const handleSkuAtsUpdate = (
    ats,
    atsData
) => (atsData.availableToSell && atsData.availableToSell > 0)
                ? ats.filter((atsRecord) => !(atsRecord.storeId === atsData.storeId))
                  .concat({
                    storeId: atsData.storeId,
                    availableToSell: atsData.availableToSell
                  })
                : ats.filter((atsRecord) => !(atsRecord.storeId === atsData.storeId));

module.exports = {
    handleStyleAtsUpdate,
    handleSkuAtsUpdate
};
