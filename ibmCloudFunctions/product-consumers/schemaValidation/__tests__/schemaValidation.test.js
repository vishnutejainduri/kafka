const schemaValidator = require('../index.js');

describe("schemaValidator", function() {
    describe("validates addFacetsToBulkImportQueue", function() {
        it("throws an error if params is not valid", function() {
            const invalidParams = {
                cfName: "addFacetsToBulkImportQueue"
            };
            expect(() => schemaValidator(invalidParams)).toThrow(Error);
        }),
        it("returns params as is if the params is valid", function() {
            const validParams = {
                cfName: "addFacetsToBulkImportQueue",
                messages: []
            };
            expect(schemaValidator(validParams)).toEqual(validParams);
        });
        it("returns messages as is if the messages is valid", function() {
            const paramsWithValidMessages = {
                cfName: "addFacetsToBulkImportQueue",
                messages: [{
                    value: {
                        STYLEID: 'styleId',
                        CATEGORY: 'Category',
                        DESC_ENG: 'eng-desc'
                    },
                }]
            };
            expect(schemaValidator(paramsWithValidMessages)).toEqual(paramsWithValidMessages);
        });
        it("returns any messages that fail validation as invalidMessages", function() {
            const invalidMessage = {
                value: {
                    STYLEID: 'styleId',
                    CATEGORY: 'Category',
                    // missing  DESC_ENG
                    // DESC_ENG: 'eng-desc'
                },
            };
            const paramsWithInvalidMessages = {
                cfName: "addFacetsToBulkImportQueue",
                messages: [invalidMessage]
            };
            const returnedParams = schemaValidator(paramsWithInvalidMessages);
            expect(returnedParams.invalidMessages[0].message).toEqual(invalidMessage);
            expect(returnedParams.invalidMessages[0].errors.length).toBeGreaterThan(0);
        });
    });
});
