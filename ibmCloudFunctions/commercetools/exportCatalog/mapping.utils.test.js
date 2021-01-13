const { categoryIsValid, formatBarcodeFromVariantBarcodes, sortCategories, getAttributesFromVariant } = require('./mapping.utils')

describe('categoryIsValid', () => {
  const dpmRootCategoryId = 'ROOT_CATEGORY_ID'

  it('classifies brand categories as invalid', () => {
    const brandCategory = {
      obj: {
        key: 'BRANDS-l1SAXX',
        ancestors: [{ id: 'NOT_ROOT_CATEGORY_ID' }]
      }
    }

    expect(categoryIsValid(dpmRootCategoryId)(brandCategory)).toBe(false)
  })

  it('classifies categories that fall under the root DPM category as valid', () => {
    const categoryThatFallsUnderTheRootDpmCategory = {
      obj: {
        key: 'DPMROOTCATEGORY-l1Clothing-l2IntimateApparel',
        ancestors: [{ id: dpmRootCategoryId }, { id: 'NOT_ROOT_CATEGORY_ID' }]
      }
    }

    expect(categoryIsValid(dpmRootCategoryId)(categoryThatFallsUnderTheRootDpmCategory)).toBe(true)
  })
})

describe('formatBarcodeFromVariantBarcodes', () => {
  const upcaBarcode = {
    obj: {
      value: {
        subType: 'UPCA',
        barcode: '1234567'
      }
    }
  }
  
  const eanBarcode = {
    obj: {
      value: {
        subType: 'EAN',
        barcode: '7654321'
      }
    }
  }
  
  const upceBarcode = {
    obj: {
      value: {
        subType: 'UPCE'
      }
    }
  }
  
  const incompleteBarcode = {}

  it('returns `null` when given an empty array', () => {
    expect(formatBarcodeFromVariantBarcodes([])).toBe(null)
  })

  it('returns `null` when given an array that has only invalid barcodes', () => {
    expect(formatBarcodeFromVariantBarcodes([upceBarcode, incompleteBarcode])).toBe(null)
  })

  it('returns the barcode number when given an array that has only a valid barcode', () => {
    expect(formatBarcodeFromVariantBarcodes([upcaBarcode])).toBe('1234567')
    expect(formatBarcodeFromVariantBarcodes([eanBarcode])).toBe('7654321')
  })

  it('returns the barcode number of the valid barcode when given an array that has one valid barcode and one invalid barcode', () => {
    expect(formatBarcodeFromVariantBarcodes([upcaBarcode, incompleteBarcode])).toBe('1234567')
    expect(formatBarcodeFromVariantBarcodes([incompleteBarcode, upcaBarcode])).toBe('1234567')
  })
})

describe('getAttributesFromVariant', () => {
  it('returns an object that maps each name in the array of name-value pairs to its value when given a variant', () => {
    const variant = {
      attributes: [
        { name: 'sizeChart', value: 2 },
        { name: 'onSale', value: false },
        { name: 'colorId', value: '072' }
      ]
    }

    expect(getAttributesFromVariant(variant)).toEqual({
      sizeChart: 2,
      onSale: false,
      colorId: '072'
    })
  })
})

describe('sortCategories', () => {
  const category1 = {
    obj: {
      ancestors: []
    }
  }

  const category2 = {
    obj: {
      ancestors: ['c1']
    }
  }

  const category3 = {
    obj: {
      ancestors: ['c1', 'c2']
    }
  }

  it('returns an array of categories sorted in ascending order by number of ancestors when given an array of unsorted commercetools categories', () => {
    expect(sortCategories([category2, category3, category1])).toEqual([category1, category2, category3])
  })
})
