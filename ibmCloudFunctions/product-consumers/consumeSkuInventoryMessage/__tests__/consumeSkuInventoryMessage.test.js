const { handleStyleUpdate }  = require('../utils');

describe('handleStyleUpdate', () => {
    it('returns an instance of error if a function failes', async () => {
        // test data
        const skus = {
            findOne: async () => ({})
        };
        const styles = {
            findOne: async () => ({}),
            // ---> required method on styles
            // updateOne: async () => {}
        };
        const inventoryData = {};

        // test run
        const result = await handleStyleUpdate(skus, styles, inventoryData);
        expect(result instanceof Error).toBe(true);
    });

    it('successfully returns for complete input', async () => {
        // test data
        const styleId = '#id';
    
        const inventoryData = {
            styleId
        };

        const skus = {
            findOne: async () => ({

            })
        };

        const mockStylesUpdateOne = jest.fn(async () => ({ [styleId]: true }));

        const styles = {
            findOne: async () => ({}),
            updateOne: mockStylesUpdateOne
        };

        // test run
        const result = await handleStyleUpdate(skus, styles, inventoryData);
        expect(result).toEqual({ [styleId]: true });
        expect(mockStylesUpdateOne.mock.calls[0][0]).toEqual({ _id: styleId });
    });
});
