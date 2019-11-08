const handleStyleAtsUpdate = (
    ats,
    atsData,
    threshold
) => {
        const shouldUpdateAts = (atsData.availableToSell && atsData.availableToSell > 0);
        const originalAtsRecords = ats.filter((atsRecord) => !(atsRecord.skuId === atsData.skuId))

        if (shouldUpdateAts) {
          const newAtsRecord = {
              skuId: atsData.skuId,
              threshold: threshold,
              ats: ats.filter((atsRecord) => atsRecord.skuId === atsData.skuId).length === 0
                  ? [{
                      storeId: atsData.storeId,
                      availableToSell: atsData.availableToSell
                    }]
                  : ats.filter((atsRecord) => atsRecord.skuId === atsData.skuId)[0].ats.filter((atsValue) => !(atsValue.storeId === atsData.storeId)).concat({
                    storeId: atsData.storeId,
                    availableToSell: atsData.availableToSell
                  })
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
