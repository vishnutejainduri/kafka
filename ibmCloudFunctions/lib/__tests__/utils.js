const { groupByAttribute } = require('../utils')

describe('groupByAttribute', function () {
    const firstBatch = [{ styleId: 1, value: '1-1' }, { styleId: 1, value: '1-2' }]
    const secondBatch = [{ styleId: 2, value: '2-1' }]

    const items = [null, new Error(''), ...firstBatch, ...secondBatch]
    firstBatch.originalIndexes = [2, 3]
    secondBatch.originalIndexes = [4]

    it('handles errors and nulls and valid items', function () {
        const result = groupByAttribute('styleId')(items)
        expect(result).toEqual([
            firstBatch,
            secondBatch
        ])
    })

    it('handles errors and nulls', function () {
        const items = [null, new Error('')]
        const result = groupByAttribute('styleId')(items)
        expect(result).toEqual([])
    })

    it('throws an error if the attribute does not exist in valid items', function () {
        expect(() => groupByAttribute('non-existnig-attribute')(items)).toThrow()
    })
})
