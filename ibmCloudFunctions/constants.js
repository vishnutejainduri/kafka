const priceGroupsToLocalizedPriceGroupStrings = {
  under250: {
    en: 'Under $250',
    fr: 'Moins que 250$'
  },
  '250-499': {
    en: '$250-$499',
    fr: '250$-499$'
  },
  '500-999': {
    en: '$500-$999',
    fr: '500$-999$'
  },
  '1000-1999': {
    en: '$1,000-$1,999',
    fr: '1000$-1999$'
  },
  '2000-2999': {
    en: '$2,000-$2,999',
    fr: '2000$-2999$'
  },
  above3000: {
    en: 'Above $3,000',
    fr: 'Plus que 3000$'
  }
}

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
  },
  priceGroupsToLocalizedPriceGroupStrings
}
