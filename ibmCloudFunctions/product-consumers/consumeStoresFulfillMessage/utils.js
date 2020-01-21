const handleStyleAtsRecalc = async (
  bulkStyleAtsUpdates,
  storeData,
  inventory
) => {
              const unpaddedStoreId = parseInt(storeData._id, 10) 
              
              const recalcAtsStyleIds = await inventory.aggregate([{ $match: { storeId: unpaddedStoreId, availableToSell: { $gt:0 } } }, { $group: { _id: '$styleId' } } ]).toArray()
              recalcAtsStyleIds.map((style) => {
                const styleUpdate = {
                  _id: style._id,
                  insertTimestamp: (new Date()).getTime()
                };
                bulkStyleAtsUpdates.find({ _id: styleUpdate._id }).upsert().updateOne(styleUpdate);
              });
              return bulkStyleAtsUpdates;
      }

module.exports = {
  handleStyleAtsRecalc
};
