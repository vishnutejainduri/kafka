const schemaValidator = require('../index.js');

describe("schemaValidator", function() {
    jest.setTimeout(60000);
    describe("validates addMediaContainerToQueue", function() {
        it("returns params as is if the params is valid", async function() {
            const validMessage = {
                value: {
                    CODE: ""
                }
            };
            const validParams = {
                messages: [validMessage],
                topicName: "media-containers-connect-jdbc",
                cfName: "addMediaContainerToQueue"
            };
            expect(await schemaValidator(validParams)).toEqual(validParams);
        });
    });

    describe("validates addFacetsToBulkImportQueue", function() {
        it("throws an error if params is not valid", async function() {
            const invalidParams = {
                cfName: "addFacetsToBulkImportQueue"
            };
            await expect(schemaValidator(invalidParams)).rejects.toThrow(Error);
        }),
        it("returns params as is if the params is valid", async function() {
            const validParams = {
                cfName: "addFacetsToBulkImportQueue",
                messages: []
            };
            expect(await schemaValidator(validParams)).toEqual(validParams);
        });
        it("returns messages as is if the messages is valid", async function() {
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
            expect(await schemaValidator(paramsWithValidMessages)).toEqual(paramsWithValidMessages);
        });
        it("returns any messages that fail validation as invalidMessages", async function() {
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
            const returnedParams = await schemaValidator(paramsWithInvalidMessages);
            expect(returnedParams.invalidMessages[0].message).toEqual(invalidMessage);
            expect(returnedParams.invalidMessages[0].error.debugInfo.validationErrors.length).toBeGreaterThan(0);
        });
    });
});
