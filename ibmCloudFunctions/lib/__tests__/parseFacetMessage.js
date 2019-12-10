const { parseFacetMessage } = require('../parseFacetMessage');

describe('parseFacetMessage', () => {
    describe('validation', () => {
        it('throws an error if an empty message is passed', () => {
            const emptyMessage = {};
            let result;
            try {
                parseFacetMessage(emptyMessage);
            } catch (error) {
                result = error;
            }
            expect(result instanceof Error).toBe(true);
        });

        it('throws an error if an invalid message with empty value is passed', () => {
            const invalidMessage = { value: {} };
            let result;
            try {
                parseFacetMessage(invalidMessage);
            } catch (error) {
                result = error;
            }
            expect(result instanceof Error).toBe(true);
        });

        it('does not throw an error if a valid message is passed', () => {
            const validMessage = {
                value: {
                    CATEGORY: "Fabric",
                    STYLEID: "style-id",
                    DESC_ENG: "english-desc",
                    DESC_FR: "french-desc"
                }
            };
            const result = parseFacetMessage(validMessage);
            expect(result).toMatchObject({
                _id: expect.any(String),
                id: expect.any(String),
                styleId: expect.any(String),
                facetValue: expect.objectContaining({
                    en: expect.any(String),
                    fr: expect.any(String)
                })
            });
        });

        it('parses categories that are not mapped', () => {
            const validMessage = {
                value: {
                    CATEGORY: "category not mapped",
                    STYLEID: "style-id",
                    DESC_ENG: "english-desc",
                    DESC_FR: "french-desc"
                }
            };
            const result = parseFacetMessage(validMessage);
            expect(result).toMatchObject({
                _id: "style-idcategoryNotMapped",
                id: expect.any(String),
                styleId: expect.any(String),
                facetValue: expect.objectContaining({
                    en: expect.any(String),
                    fr: expect.any(String)
                })
            });
        });
    });
});


