const consumeStoresMessage = require('../');
const { getBulkAtsStyles } = require('../utils');
const { parseStoreMessage } = require('../../../lib/parseStoreMessage');

const getCollection = require('../../../lib/getCollection');

const params = {
    topicName: 'stores-connect-jdbc',
    messages: [{
        topic: 'stores-connect-jdbc',
        value: {
            'SITE_ID': '00007',
            'NAME': 'name',
            'ADDRESS1': 'address1',
            'ADDRESS2': 'address2',
            'CITY': 'city',
            'STATE': 'state',
            'POSTALZIP': 'zipCode',
            'PHONE': 'telephone',
            'LATITUDE': 43.6535366,
            'LONGITUDE': -79.3799731,
            'FULFILL_STATUS': 'Y',
            'PICKUP_STATUS': 'Y',
            'STORELOOKUP_STATUS': 'Y',
            'DEP27_FULFILL_STATUS': 'Y',
            'DAYS_OPEN_PER_WEEK': 7,
            'ZONE_ID': 1,
            'DATE_CLOSED': null,
            'POS_ENABLED': 'Y',
            'SUB_TYPE': 'subType',
            'LASTMODIFIEDDATE': 1000000000,
          }
    }],
    mongoUri: 'mongo-uri',
    dbName: 'db-name',
    mongoCertificateBase64: 'mong-certificate',
    collectionName: 'stores',
    inventoryCollectionName: 'inventory',
    bulkAtsRecalculateQueue: 'bulkAtsRecalculateQueue'
};

describe('consumeStoresMessage', () => {
    it('missing all parameters; should fail', async () => {
        await expect((await consumeStoresMessage({})).error).toBeTruthy();
    });
    it('correct message; no bulk ats', async () => {
        const response = await consumeStoresMessage(params);
        expect(response).toEqual({ shouldResolveOffsets: 1 });
    });
    it('correct message; goes through bulk ats code', async () => {
        params.POS_ENABLED = 'N';

        const response = await consumeStoresMessage(params);
        expect(response).toEqual({ shouldResolveOffsets: 1 });
    });
    it('correct message; goes through bulk ats code for dep27', async () => {
        params.DEP27_FULFILL_STATUS = 'N';

        const response = await consumeStoresMessage(params);
        expect(response).toEqual({ shouldResolveOffsets: 1 });
    });
});

describe('getBulkAtsStyles', () => {
    it('missing all parameters; should fail', async () => {
        await expect(getBulkAtsStyles()).rejects.toThrow();
    });
    it('correct message; should return a style', async () => {
        const inventory = await getCollection(params, params.inventoryCollectionName);
        const bulkAtsRecalculateQueue = await getCollection(params, params.bulkAtsRecalculateQueue);
        let bulkStyleAtsUpdates = bulkAtsRecalculateQueue.initializeUnorderedBulkOp();

        bulkStyleAtsUpdates = await getBulkAtsStyles(bulkStyleAtsUpdates, { _id: '00007' }, inventory);

        const response = await bulkStyleAtsUpdates.find().upsert().updateOne();

        expect(response._id).toBe('success');
    });
});

describe('parseStoreMessage', () => {
    it('wrong topic; should fail', () => {
        const wrongTopicMessage = { topic: 'foo' };
        expect(parseStoreMessage.bind(null, wrongTopicMessage)).toThrow('Can only parse store update messages');
    });
    it('correct message; should return transformed store obj', async () => {
        const response = parseStoreMessage(params.messages[0]);

        // check one of the most critical fields, if true, transform must have worked well
        expect(response.isVisible).toBe(true);
    });
});
