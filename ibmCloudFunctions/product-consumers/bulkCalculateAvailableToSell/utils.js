const createError = require('../../lib/createError');
const { addErrorHandling } = require('../utils');

const calculateSkuAts = async (
    skuRecord,
    styleData,
    stores,
    inventory
) => {
      const skuAts = [];
      const skuOnlineAts = [];

      const inventoryRecords = await inventory.find({ skuId: skuRecord._id, availableToSell: { $gt: 0 } }).toArray()
      .catch(originalError => {
          throw createError.bulkCalculateAvailableToSell.failedGetInventory(originalError, skuRecord);
      })

      await Promise.all(inventoryRecords.map(addErrorHandling(async (inventoryRecord) => {
          const storeData = await stores.findOne({ _id: inventoryRecord.storeId.toString().padStart(5, '0') })
          .catch(originalError => {
              throw createError.bulkCalculateAvailableToSell.failedGetStore(originalError, inventoryRecord);
          })
          if (inventoryRecord.availableToSell > 0) {
            skuAts.push({
              storeId: inventoryRecord.storeId,
              availableToSell: inventoryRecord.availableToSell
            })
            if ((storeData.canOnlineFulfill && styleData.departmentId !== "27") || (storeData.canFulfillDep27 && styleData.departmentId === "27")) {
              skuOnlineAts.push({
                storeId: inventoryRecord.storeId,
                availableToSell: inventoryRecord.availableToSell
              })
            }
          }
      })));

      return {
        skuAts,
        skuOnlineAts
      };
}

module.exports = {
  calculateSkuAts: calculateSkuAts,
  calculateStyleAts: async (
    styleToRecalcAts,
    styles,
    skus,
    stores,
    inventory
) => {
          const styleData = await styles.findOne({ _id: styleToRecalcAts._id })
          .catch(originalError => {
              throw createError.bulkCalculateAvailableToSell.failedGetStyle(originalError, styleToRecalcAts);
          })
          if (!styleData) return null;
          const styleAts = [];
          const styleOnlineAts = [];

          const skuRecords = await skus.find({ styleId: styleToRecalcAts._id }).toArray()
          .catch(originalError => {
              throw createError.bulkCalculateAvailableToSell.failedGetSku(originalError, styleToRecalcAts);
          })
          
          const skuAtsOperations = [];
          await Promise.all(skuRecords.map(addErrorHandling(async (skuRecord) => {
              try {
                const { skuAts, skuOnlineAts } = await calculateSkuAts(skuRecord, styleData, stores, inventory);

                if (skuAts.length > 0) {
                  styleAts.push({
                    skuId: skuRecord._id,
                    threshold: skuRecord.threshold,
                    ats: skuAts
                  })
                }
                if (skuOnlineAts.length > 0) {
                  styleOnlineAts.push({
                    skuId: skuRecord._id,
                    threshold: skuRecord.threshold,
                    ats: skuOnlineAts
                  })
                }

                skuAtsOperations.push(skus.updateOne({ _id: skuRecord._id }, { $currentDate: { lastModifiedInternalAts: { $type:"timestamp" } }, $set: { ats: skuAts, onlineAts: skuOnlineAts } })
                .catch(originalError => {
                    throw createError.bulkCalculateAvailableToSell.failedUpdateSkuAts(originalError, skuRecord);
                }))
              } catch(originalError) {
                  throw createError.bulkCalculateAvailableToSell.failedCalculateSkuAts(originalError, skuRecord);
              }
          })))

          return {
            skuAtsOperations,
            styleAts,
            styleOnlineAts
          }; 
  }
};

