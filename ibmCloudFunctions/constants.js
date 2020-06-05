module.exports = {
  // The three accepted activity types from jesta
  // Both A and C are treated as the same, can be either create or update
  // Type D is always a deletion
  priceChangeActivityTypes: {
    APPROVED: 'A',
    CREATED: 'C',
    DELETED: 'D'
  },
  // For commercetools, we want to process only prices set for the online store i.e. those with SITE_ID === '00990'
  // For mongo/algolia we need to distinguish between these prices, because they will be used by advisor app who need access to both
  siteIds: {
    // This refers to the flagship store at Bloor street in Toronto which should have all of the items
    IN_STORE: '00011',
    ONLINE: '00990'
  }
}
