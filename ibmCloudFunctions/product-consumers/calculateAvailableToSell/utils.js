const handleStyleAtsUpdate = (
    ats,
    atsData,
    threshold
) => (atsData.availableToSell && atsData.availableToSell > 0)
                ? ats.filter((atsRecord) => !(atsRecord.skuId === atsData.skuId))
                  .concat({
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
                  })
                : ats.filter((atsRecord) => !(atsRecord.skuId === atsData.skuId))

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
