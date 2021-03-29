const addStyleToAlgoliaAvailabilityCheckQueue = (styleAvailabilityCheckQueue, styleId) =>
  styleAvailabilityCheckQueue.updateOne(
    { _id: styleId },
    {
      $currentDate: { lastModifiedInternal: { $type: 'timestamp' } },
      $set: { _id: styleId, styleId },
    },
    { upsert: true }
  );


  module.exports = {
    addStyleToAlgoliaAvailabilityCheckQueue
  }
