'use strict';
var Ajv = require('ajv');
var ajv = new Ajv({ allErrors: true });

const createError = require('../lib/createError');

const facetMap = {
    "Category": "style",
    "Fabric": "fabric",
    "Length": "length",
    "Fit": "fit",
    "Sleeve": "collar",
    "Pattern": "pattern",
    "Cuff": "cuff",
};

const facetMessageSchema = {
    "$schema": "http://json-schema.org/draft-07/schema",
    "title": "addFacetsToBulkImportQueueMessage",
    "description": "A message passed to addFacetsToBulkImportQueue",
    "type": "object",
    "properties": {
        "value": {
            "description": "Value of a message",
            "type": "object",
            "properties": {
                "CATEGORY": {
                    "type": "string",
                    "enum": ["Category", "Fabric", "Length", "Fit", "Sleeve", "Pattern", "Cuff"]
                },
                "STYLEID": {
                    "type": "string",
                    "minLength": 1,
                },
                "DESC_ENG": {
                    "type": "string",
                    "minLength": 1,
                },
                "DESC_FR": {
                    "type": "string",
                }
            },
            "required": ['CATEGORY', 'STYLEID', 'DESC_ENG']
        }
    },
    "required": ["value"]
}

const validate = ajv.compile(facetMessageSchema);

// Parse a message from the ELCAT.CATALOG table and return a new object with filtered and re-mapped attributes.
function parseFacetMessage(msg) {
    validate(msg);
    if (validate.errors) {
        throw createError.failedSchemaValidation(
            validate.errors,
            'parseFacetMessage'
        );
    }
    const facetName = facetMap[msg.value.CATEGORY];
    return {
        _id: msg.value.STYLEID + facetName,
        id: msg.value.STYLEID + facetName,
        styleId: msg.value.STYLEID,
        facetName,
        facetValue: {
            en: msg.value.DESC_ENG,
            fr: msg.value.DESC_FR
        }
    };
}

module.exports = {
    parseFacetMessage
};
