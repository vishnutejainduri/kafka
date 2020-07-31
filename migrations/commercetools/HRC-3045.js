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
          "en-CA": "Indicates whether `hr-orders-service` has successfully sent the order to the CRM service, which in turn will send the appropriate notifications to the customer."
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
