const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const schema = require('../schema.json');
const validateMessage = ajv.compile(schema.message);

describe('facet message validation', () => {
    it('returns an error if an invalid message with empty value is passed', () => {
        const invalidMessage = { value: {} };
        validateMessage(invalidMessage);
        expect(validateMessage.errors).toBeTruthy();
    });

    it('does not return an error if a valid message is passed', () => {
        const validMessage = {
            value: {
                CATEGORY: "Fabric",
                STYLEID: "style-id",
                DESC_ENG: "english-desc",
                DESC_FR: "french-desc"
            }
        };
        validateMessage(validMessage);
        expect(validateMessage.errors).toBeFalsy();
    });

    it('validates categories that are not mapped', () => {
        const validMessage = {
            value: {
                CATEGORY: "category not mapped",
                STYLEID: "style-id",
                DESC_ENG: "english-desc",
                DESC_FR: "french-desc"
            }
        };
        validateMessage(validMessage);
        expect(validateMessage.errors).toBeFalsy();
    });
});
