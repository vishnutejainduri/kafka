const { findApplicablePriceChanges, getPriceInfo } = require('../utils')
const { siteIds, priceChangeActivityTypes } = require('../../../constants');

describe('findApplicablePriceChanges', () => {
  it('returns promotional price changes for different site IDs', () => {
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
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: mockPriceChanges[0],
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('returns no price changes if the endDate is past the current date', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2018'),
      endDate: new Date('2019'),
      activityType: priceChangeActivityTypes.APPROVED
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: undefined
    })
  })
  it('returns the price change if there is an endDate in the future', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2018'),
      endDate: new Date(new Date().getTime() + 10000),
      activityType: priceChangeActivityTypes.APPROVED
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: undefined
    })
  })
  it('returns no price change if the start date is in the future', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date(new Date().getTime() + 10000),
      activityType: priceChangeActivityTypes.APPROVED
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: undefined
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
  it('ignores a price change activity of delete type with a price change ID that exists but a site ID that does not exist in the available price changes', () => {
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
      siteId: 'none-existent',
      activityType: priceChangeActivityTypes.DELETED
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: mockPriceChanges[0],
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('throws an error if there are overlapping price changes for the same site ID', () => {
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
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED
    }]
    expect(() => findApplicablePriceChanges(mockPriceChanges)).toThrow(new Error('Cannot process overlapping price changes for the same site ID.'))
  })
})

describe('findApplicablePriceChanges', () => {
  const originalPrice = 10
  it('returns original price if no price change exists and sale flags will be false', () => {
    const priceChanges = {}
    expect(getPriceInfo(originalPrice, priceChanges)).toEqual({
      originalPrice,
      onlinePrice: originalPrice,
      inStorePrice: originalPrice,
      isSale: false,
      isOnlineSale: false
    })
  })

  it('returns sale price if price changes exists and sale flags will be true', () => {
    const applicablePriceChanges = {
      '00990': {
        newRetailPrice: 100
      },
      '00011': {
        newRetailPrice: 150
      }
    }
    expect(getPriceInfo(originalPrice, applicablePriceChanges)).toEqual({
      originalPrice,
      onlinePrice: applicablePriceChanges['00990'].newRetailPrice,
      inStorePrice: applicablePriceChanges['00011'].newRetailPrice,
      isSale: true,
      isOnlineSale: true
    })
  })

  it('returns a mix of online and original sale price if only online sale price exists', () => {
    const applicablePriceChanges = {
      '00990': {
        newRetailPrice: 100
      }
    }
    expect(getPriceInfo(originalPrice, applicablePriceChanges)).toEqual({
      originalPrice,
      onlinePrice: applicablePriceChanges['00990'].newRetailPrice,
      inStorePrice: originalPrice,
      isSale: false,
      isOnlineSale: true
    })
  })
})

