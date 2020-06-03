const { findApplicablePriceChanges } = require('../utils')
const { siteIds, priceChangeActivityTypes } = require('../../../constants');

describe('findApplicablePriceChanges', () => {
  it('returns standard price change if there is no promotional price', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.APPROVED
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: mockPriceChanges[0],
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('returns promotional price change even if there is an original price', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2019'),
      activityType: priceChangeActivityTypes.APPROVED
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED
    },{
      priceChangeId: '3',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2020'),
      endDate: new Date('2021'),
      activityType: priceChangeActivityTypes.APPROVED
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: mockPriceChanges[2],
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('does not return a deleted price change', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2019'),
      activityType: priceChangeActivityTypes.APPROVED
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED
    },{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      activityType: priceChangeActivityTypes.DELETED
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: undefined,
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('does not mix delete activities with the same price change but different site IDs', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2019'),
      activityType: priceChangeActivityTypes.APPROVED
    },{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED
    },{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      activityType: priceChangeActivityTypes.DELETED
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: undefined,
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
})
