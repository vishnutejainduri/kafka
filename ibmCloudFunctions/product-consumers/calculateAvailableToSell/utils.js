const handleAtsUpdate = (
    ats,
    atsData,
    threshold
) => (atsData.availableToSell && atsData.availableToSell > 0)
                ? ats.filter((atsRecord) => !(atsRecord.skuId === atsData.skuId && atsRecord.storeId === atsData.storeId))
                  .concat({
                    skuId: atsData.skuId,
                    storeId: atsData.storeId,
                    availableToSell: atsData.availableToSell,
                    threshold: threshold
                  })
                : ats.filter((atsRecord) => !(atsRecord.skuId === atsData.skuId && atsRecord.storeId === atsData.storeId));

module.exports = {
    handleAtsUpdate
};
