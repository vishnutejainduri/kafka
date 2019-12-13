const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const schema = require('../schema.json');

describe("schema validtion for addMediaContainerToQueue", () => {
    describe("params", () => {
        it("accepts valid params", () => {
            const validParams = {
                messages: [],
                topicName: "media-containers-connect-jdbc",
                cfName: "addMediaContainerToQueue"
            };
            const validate = ajv.compile(schema.params);
            validate(validParams);
            expect(validate.errors).toBe(null);
        });

        it("rejects invalid valid params", () => {
            const validParams = {
                messages: [],
                topicName: "media-containers-connect-jdbc",
            };
            const validate = ajv.compile(schema.params);
            validate(validParams);
            expect(validate.errors).not.toBe(null);
        });
    });

    describe("message", () => {
        it("accepts valid message", () => {
            const validMessage = {
                value: {
                    CODE: ""
                }
            };
            const validate = ajv.compile(schema.message);
            validate(validMessage);
            expect(validate.errors).toBe(null);
        });

        it("rejects invalid message", () => {
            const invalidMessage = {
                value: {
                    CODE: null
                }
            };
            const validate = ajv.compile(schema.message);
            validate(invalidMessage);
            expect(validate.errors).not.toBe(null);
        });
    });
});
