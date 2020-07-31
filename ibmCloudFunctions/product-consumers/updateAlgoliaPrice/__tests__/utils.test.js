const { findApplicablePriceChanges, getPriceInfo, extractStyleId } = require('../utils')
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
      [siteIds.IN_STORE]: mockPriceChanges[0]
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
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2019')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED
    },{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      activityType: priceChangeActivityTypes.DELETED,
      processDateCreated: new Date('2020')
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: undefined,
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('does not deleted a price change if deletion had happened before approval/creation', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2019'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2020')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED
    },{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      activityType: priceChangeActivityTypes.DELETED,
      processDateCreated: new Date('2019')
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: mockPriceChanges[0],
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
  it('applies the latest change there are overlapping price changes for the same site ID with different price change IDs', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2019'),
      activityType: priceChangeActivityTypes.APPROVED
    },{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2019'),
      activityType: priceChangeActivityTypes.CREATED,
      newRetailPrice: 100,
      processDateCreated: new Date('2019')
    },{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2019'),
      activityType: priceChangeActivityTypes.CREATED,
      newRetailPrice: 105,
      processDateCreated: new Date('2020')
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: mockPriceChanges[0],
      [siteIds.ONLINE]: mockPriceChanges[2]
    })
  })
  it('throws an error if there are overlapping price changes for the same site ID with the same price change IDs', () => {
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
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED
    }]
    expect(() => findApplicablePriceChanges(mockPriceChanges)).toThrow(new Error(`Cannot process overlapping price changes for the same site ID for price changes: StyleId: ${mockPriceChanges[0].id}, Price Change ID: ${mockPriceChanges[0].priceChangeId} overlaps with Price Change ID: ${mockPriceChanges[2].priceChangeId}`))
  })
})

describe('findApplicablePriceChanges + findCurrentPriceFromOverlappingPrices', () => {
  it('overlapping permanent markdowns', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2019')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED,
      processDateCreated: new Date('2020')
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('overlapping permanent markdowns; unfixable overlap', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2020')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED,
      processDateCreated: new Date('2020')
    }]
    expect(() => findApplicablePriceChanges(mockPriceChanges)).toThrow(new Error(`Cannot process overlapping price changes for the same site ID for price changes: StyleId: ${mockPriceChanges[0].id}, Price Change ID: ${mockPriceChanges[0].priceChangeId} overlaps with Price Change ID: ${mockPriceChanges[1].priceChangeId}`))
  })
  it('overlapping permanent markdowns; overlap but across sites so both are valid and used', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2020')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED,
      processDateCreated: new Date('2020')
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: mockPriceChanges[0],
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('overlapping permanent and temporary markdowns', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2020')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      endDate: new Date('2021'),
      activityType: priceChangeActivityTypes.CREATED,
      processDateCreated: new Date('2020')
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.ONLINE]: mockPriceChanges[1]
    })
  })
  it('overlapping permanent and temporary markdowns across two sites', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2020')
    },{
      priceChangeId: '2',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2020'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2020')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2020'),
      endDate: new Date('2021'),
      activityType: priceChangeActivityTypes.CREATED,
      processDateCreated: new Date('2020')
    },{
      priceChangeId: '1',
      siteId: siteIds.IN_STORE,
      startDate: new Date('2020'),
      endDate: new Date('2021'),
      activityType: priceChangeActivityTypes.CREATED,
      processDateCreated: new Date('2020')
    }]
    const applicablePriceChanges = findApplicablePriceChanges(mockPriceChanges)
    expect(applicablePriceChanges).toEqual({
      [siteIds.IN_STORE]: mockPriceChanges[3],
      [siteIds.ONLINE]: mockPriceChanges[2]
    })
  })
})

describe('findApplicablePriceChanges + areAvailablePricesOverlapping', () => {
  it('overlapping inactive temporary markdown with active temporary markdown; throws error', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2018'),
      endDate: new Date('2019'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2018')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2018'),
      endDate: new Date('2020'),
      activityType: priceChangeActivityTypes.CREATED,
      processDateCreated: new Date('2020')
    }]
    expect(() => findApplicablePriceChanges(mockPriceChanges)).toThrow(new Error(`Cannot process overlapping price changes for the same site ID for price changes: StyleId: ${mockPriceChanges[0].id}, Price Change ID: ${mockPriceChanges[0].priceChangeId} has overlaps`))
  })
  it('overlapping inactive temporary markdown with inactive temporary markdown; throws error', () => {
    const mockPriceChanges = [{
      priceChangeId: '1',
      siteId: siteIds.ONLINE,
      startDate: new Date('2018'),
      endDate: new Date('2019'),
      activityType: priceChangeActivityTypes.APPROVED,
      processDateCreated: new Date('2018')
    },{
      priceChangeId: '2',
      siteId: siteIds.ONLINE,
      startDate: new Date('2018'),
      endDate: new Date('2019'),
      activityType: priceChangeActivityTypes.CREATED,
      processDateCreated: new Date('2018')
    }]
    expect(() => findApplicablePriceChanges(mockPriceChanges)).toThrow(new Error(`Cannot process overlapping price changes for the same site ID for price changes: StyleId: ${mockPriceChanges[0].id}, Price Change ID: ${mockPriceChanges[0].priceChangeId} has overlaps`))
  })
})

describe('getPriceInfo', () => {
  const originalPrice = 10
  describe('original price is applicable as the lowest price', () => {
    it('returns original price if no price change exists and sale flags will be false', () => {
      const priceChanges = {}
      expect(getPriceInfo(originalPrice, priceChanges)).toEqual({
        originalPrice,
        onlineSalePrice: null,
        inStoreSalePrice: null,
        isSale: false,
        isOnlineSale: false,
        lowestPrice: originalPrice,
        lowestOnlinePrice: originalPrice
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
        inStoreSalePrice: applicablePriceChanges['00011'].newRetailPrice,
        onlineSalePrice: applicablePriceChanges['00990'].newRetailPrice,
        isSale: true,
        isOnlineSale: true,
        lowestPrice: originalPrice,
        lowestOnlinePrice: originalPrice
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
        inStoreSalePrice: null,
        onlineSalePrice: applicablePriceChanges['00990'].newRetailPrice,
        isSale: false,
        isOnlineSale: true,
        lowestPrice: originalPrice,
        lowestOnlinePrice: originalPrice
      })
    })
  })

  describe('sale prices are applicable as the lowest price', () => {
    it('returns a mix of online and original sale price if only online sale price exists and correctly', () => {
      const applicablePriceChanges = {
        '00990': {
          newRetailPrice: 5
        }
      }
      expect(getPriceInfo(originalPrice, applicablePriceChanges)).toEqual({
        originalPrice,
        inStoreSalePrice: null,
        onlineSalePrice: applicablePriceChanges['00990'].newRetailPrice,
        isSale: false,
        isOnlineSale: true,
        lowestPrice: applicablePriceChanges['00990'].newRetailPrice,
        lowestOnlinePrice: applicablePriceChanges['00990'].newRetailPrice
      })
    })
    it('returns a mix of in-store and original sale price if only in-store sale price exists and correctly', () => {
      const applicablePriceChanges = {
        '00011': {
          newRetailPrice: 5
        }
      }
      expect(getPriceInfo(originalPrice, applicablePriceChanges)).toEqual({
        originalPrice,
        inStoreSalePrice: applicablePriceChanges['00011'].newRetailPrice,
        onlineSalePrice: null,
        isSale: true,
        isOnlineSale: false,
        lowestPrice: applicablePriceChanges['00011'].newRetailPrice,
        lowestOnlinePrice: originalPrice
      })
    })

    it('returns sale price if price changes exists and sale flags will be true and lowest online price is not affected by instore price', () => {
      const applicablePriceChanges = {
        '00990': {
          newRetailPrice: 8
        },
        '00011': {
          newRetailPrice: 5
        }
      }
      expect(getPriceInfo(originalPrice, applicablePriceChanges)).toEqual({
        originalPrice,
        onlineSalePrice: applicablePriceChanges['00990'].newRetailPrice,
        inStoreSalePrice: applicablePriceChanges['00011'].newRetailPrice,
        isSale: true,
        isOnlineSale: true,
        lowestPrice: applicablePriceChanges['00011'].newRetailPrice,
        lowestOnlinePrice: applicablePriceChanges['00990'].newRetailPrice
      })
    })
  })

  it('returns null as all prices if no prices are available', () => {
    const applicablePriceChanges = {}
    expect(getPriceInfo(undefined, applicablePriceChanges)).toEqual({
      originalPrice: null,
      onlineSalePrice: null,
      inStoreSalePrice: null,
      isSale: false,
      isOnlineSale: false,
      lowestPrice: null,
      lowestOnlinePrice: null
    })
  })

  it('returns prices that are 0 properly', () => {
    const applicablePriceChanges = {}
    expect(getPriceInfo(0, applicablePriceChanges)).toEqual({
      originalPrice: 0,
      onlineSalePrice: null,
      inStoreSalePrice: null,
      isSale: false,
      isOnlineSale: false,
      lowestPrice: 0,
      lowestOnlinePrice: 0
    })
  })

  it('handles sale price that is 0 properly', () => {
    const applicablePriceChanges = {
      '00011': {
        newRetailPrice: 0
      }
    }
    expect(getPriceInfo(undefined, applicablePriceChanges)).toEqual({
      originalPrice: null,
      onlineSalePrice: null,
      inStoreSalePrice: 0,
      isSale: true,
      isOnlineSale: false,
      lowestPrice: null,
      lowestOnlinePrice: null
    })
  })
})

describe('extractStyleId', () => {
  it ('extracts style from sale price messages', () => {
    const message = {
      topic: 'sale-prices-connect-jdbc',
      value: {
        STYLE_ID: 'sale-style'
      }
    }
    expect(extractStyleId(message)).toEqual('sale-style')
  })
  it ('extracts style from catalog messages', () => {
    const message = {
      topic: 'styles-connect-jdbc-CATALOG',
      value: {
        STYLEID: 'catalog-style'
      }
    }
    expect(extractStyleId(message)).toEqual('catalog-style')
  })
  it ('throws an error for unknown topic', () => {
    const message = {
      topic: 'unknown-topic',
      value: {
        STYLEID: 'catalog-style'
      }
    }
    expect(() => extractStyleId(message)).toThrow()
  })
  it ('throws an error if style ID is not defined', () => {
    const message = {
      topic: 'styles-connect-jdbc-CATALOG',
      value: {
        STYLEID: undefined
      }
    }
    expect(() => extractStyleId(message)).toThrow()
  })
})
