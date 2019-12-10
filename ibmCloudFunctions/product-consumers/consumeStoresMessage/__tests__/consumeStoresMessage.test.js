const consumeStoresMessage = require('../');

jest.mock("mongodb");

describe('consumeStoresMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect(consumeStoresMessage({})).rejects.toThrow();
    });
    it('correct message', async () => {
        const params = {
            topicName: 'stores-connect-jdbc',
            messages: [{
                topic: 'stores-connect-jdbc',
                value: {
                    'BUSINESS_UNIT_ID': 1,
                    'SUB_TYPE': 'subType',
                    'SITE_ID': 'siteId',
                    'ZONE_ID': 'zoneId',
                    'DAYS_OPEN_PER_WEEK': 7,
                    'NAME': 'name',
                    'ADDRESS_1': 'address1',
                    'ADDRESS_2': 'address2',
                    'ADDRESS_3': 'address3',
                    'ADDRESS_4': 'address4',
                    'CITY': 'city',
                    'STATE_ID': 'stateId',
                    'ZIP_CODE': 'zipCode',
                    'COUNTRY_ID': 'countryId',
                    'TELEPHONE': 'telephone',
                    'FAX': 'fax',
                    'LATITUDE': 43.6535366,
                    'LONGITUDE': -79.3799731
                  }
            }],
            mongoUri: 'mongo-uri',
            dbName: 'db-name',
            mongoCertificateBase64: 'mong-certificate',
            collectionName: 'stores'
        }
        const response = await consumeStoresMessage(params);
        // returns nothing/undefined if successfully run
        expect(response).toEqual(undefined);
    });
});
