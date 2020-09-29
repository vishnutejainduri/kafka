const { isStaged } = require('../../../commercetools/constantsCt')
const {
  getAtsUpdateActionsFromAtsBySku,
  updateSkuAtsForSingleCtProduct,
  updateSkuAtsForManyCtProductsBatchedByStyleId
} = require('../commercetools')

const sku1Ats = {
  styleId: '20036681',
  skuId: '-2678929',
  ats: 0,
  atsBreakdown: [],
  onlineAts: 0
}

const sku2Ats = {
  styleId: '20036681',
  skuId: '-2679200',
  ats: 1,
  atsBreakdown: [],
  onlineAts: 1
}

const atsBySkuForStyle1 = [sku1Ats, sku2Ats]

const mockRequestBuilder = {
  products: {
    byKey: () => mockRequestBuilder.products,
    build: () => mockRequestBuilder.products
  }
}

const mockCtClient = {
  execute: () => Promise.resolve({ body: { version: 1 } })
}

const mockCtHelpers = {
  requestBuilder: mockRequestBuilder,
  client: mockCtClient
}

describe('getAtsUpdateActionsFromAtsBySku', () => {
  it('returns an array of actions to update `hasOnlineAts` when given an array of SKU ATS data', () => {
    expect(getAtsUpdateActionsFromAtsBySku(atsBySkuForStyle1)).toEqual([
      {
        action: 'setAttribute',
        sku: '-2678929',
        name: 'hasOnlineAts',
        value: false,
        staged: isStaged
      },
      {
        action: 'setAttribute',
        sku: '-2679200',
        name: 'hasOnlineAts',
        value: true,
        staged: isStaged
      }
    ])
  })
})

describe('updateSkuAtsForSingleCtProduct', () => {
  it('returns an object with the ID of the updated style and `ok` set to `true` if the update succeeds', async () => {
    const updateResult = await updateSkuAtsForSingleCtProduct(mockCtHelpers)(atsBySkuForStyle1)
    expect(updateResult).toEqual({
      ok: true,
      styleId: '20036681'
    })
  })
})

describe('updateSkuAtsForManyCtProductsBatchedByStyleId', () => {
  const sku3Ats = {
    styleId: '21036361',
    skuId: '-1678329',
    ats: 1,
    atsBreakdown: [],
    onlineAts: 1
  }

  const atsBySkuForStyle2 = [sku3Ats]

  const atsUpdatesBatchedByStyleId = [
    atsBySkuForStyle1,
    atsBySkuForStyle2
  ]

  it('returns an array of success results indicating which styles were updated when all styles are updated successfully', async () => {
    const updateResults = await updateSkuAtsForManyCtProductsBatchedByStyleId(atsUpdatesBatchedByStyleId, mockCtHelpers)
    expect(updateResults).toEqual([
      {
        ok: true,
        styleId: '20036681'
      },
      {
        ok: true,
        styleId: '21036361'
      }
    ])
  })
})
