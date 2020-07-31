// add custom field 'sentToCrmStatus' to orders on commercetools

// postman request: Types -> Create Type
const url = '{{host}}/{{projectKey}}/types/key=orderCustomFields'

const payload =
{
  "version": 1,
  "actions": [
    {
      "action": "addFieldDefinition",
      "fieldDefinition": {
        "name": "sentToCrmStatus",
        "label": {
          "en-CA": "Status of sending order to CRM service",
          "fr-CA": ""
        },
        "required": false,
        "type": {
          "name": "Enum",
          "values": [
            {
              "key": "PENDING",
              "label": "Pending"
            },
            {
              "key": "SUCCESS",
              "label": "Success"
            },
            {
              "key": "FAILURE",
              "label": "Failure"
            }
          ]
        },
        "inputHint": "SingleLine"
      }
    }
  ]
}
