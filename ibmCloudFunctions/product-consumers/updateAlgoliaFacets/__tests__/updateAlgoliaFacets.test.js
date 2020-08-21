const {
  transformUpdateQueueRequestToAlgoliaUpdates,
  generateStyleUpdatesFromAlgoliaUpdates,
  transformMicrositeAlgoliaRequests
} = require('..');
const { parseFacetMessage } = require('../../../lib/parseFacetMessage');

describe('updateAlgoliaFacets', () => {
  it('should handle individual lookup or transform failures gracefully', async () => {
    const validDeletionAggregate = [{
      _id: 'styleId',
      facets: [{
        name: 'facetName',
        value: { en: 'facetValueEn', fr: 'facetValueFr' },
        facetId: null,
        type: 'facetType',
        isMarkedForDeletion: false
      }]
    }];

    const styles = {
      findOne: jest.fn(() => {
        throw new Error();
      })
    };

    const [actual, successful] = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
    const actual2 = transformMicrositeAlgoliaRequests(actual);

    expect(actual2).toHaveLength(1);
    expect(successful).toBeEmpty;
  });

  describe('microsite attribute creation/update', () => {
    const validMessage = {
      topic: 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA',
      value: {
        'STYLEID': 'styleId',
        'CATEGORY': 'category',
        'DESC_ENG': 'micrositeDesc',
        'DESC_FR': 'micrositeDesc',
        'UPD_FLG': 'T',
        'FKORGANIZATIONNO': '1',
        'CHAR_TY_SUB_TYPE': null,
        'CHARACTERISTIC_TYPE_ID': 'DPM01',
        'CHARACTERISTIC_VALUE_ID': '57'
      }
    };

    const parsedFacetMessage = parseFacetMessage(validMessage);
    const validAggregate = [{
      _id: parsedFacetMessage.styleId,
      facets: [{
        name: parsedFacetMessage.facetName,
        value: parsedFacetMessage.facetValue,
        type: parsedFacetMessage.typeId,
        facetId: parsedFacetMessage.facetId,
        isMarkedForDeletion: parsedFacetMessage.isMarkedForDeletion
      }]
    }];

    it('should handle microsite creations', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' } }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' } }
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        microsite: [{ en: 'micrositeDesc', fr: 'micrositeDesc' }]
      }]);
    });
    it('should handle microsite and other facet creations in one call', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false
          });
        })
      };

      const multiValidAggregate = [{ ...validAggregate[0], facets: [{ ...validAggregate[0].facets[0] }, { ...validAggregate[0].facets[0], name: 'testFacet', value: 'testFacetValue', type: null }] }]

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(multiValidAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' } },
        'testFacet': 'testFacetValue'
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' } },
        'testFacet': 'testFacetValue'
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        microsite: [{ en: 'micrositeDesc', fr: 'micrositeDesc' }],
        'testFacet': 'testFacetValue'
      }]);
    });
    it('should handle microsite updates', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false,
            microsite: { 'facetid_57': { en: 'micrositeDesc_old', fr: 'micrositeDesc_old' } }
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' } }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' } }
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        microsite: [{ en: 'micrositeDesc', fr: 'micrositeDesc' }]
      }]);
    });
    it('should do a create if it can\'t match by facet id instead of an update', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false,
            microsite: { 'facetid_58': { en: 'micrositeDesc_old', fr: 'micrositeDesc_old' } }
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' }, 'facetid_58': { en: 'micrositeDesc_old', fr: 'micrositeDesc_old' } }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' }, 'facetid_58': { en: 'micrositeDesc_old', fr: 'micrositeDesc_old' } }
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        microsite: [{ en: 'micrositeDesc_old', fr: 'micrositeDesc_old' },{ en: 'micrositeDesc', fr: 'micrositeDesc' }]
      }]);
    });
  });

  describe('microsite attribute deletion', () => {
    const validDeletionMessage = {
      topic: 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA',
      value: {
        'STYLEID': 'styleId',
        'CATEGORY': 'category',
        'DESC_ENG': 'micrositeDesc',
        'DESC_FR': 'micrositeDesc',
        'UPD_FLG': 'F',
        'FKORGANIZATIONNO': '1',
        'CHAR_TY_SUB_TYPE': null,
        'CHARACTERISTIC_TYPE_ID': 'DPM01',
        'CHARACTERISTIC_VALUE_ID': '57'
      }
    };

    const parsedFacetDeletionMessage = parseFacetMessage(validDeletionMessage);
    const validDeletionAggregate = [{
      _id: parsedFacetDeletionMessage.styleId,
      facets: [{
        name: parsedFacetDeletionMessage.facetName,
        value: parsedFacetDeletionMessage.facetValue,
        type: parsedFacetDeletionMessage.typeId,
        facetId: parsedFacetDeletionMessage.facetId,
        isMarkedForDeletion: parsedFacetDeletionMessage.isMarkedForDeletion
      }]
    }];

    it('should handle microsite deletions correctly when the attribute is not set', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: {}
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: {},
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        microsite: []
      }]);
    });

    it('should handle microsite deletions correctly when the attribute already exists', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false,
            microsite: { 'facetid_57': { en: 'micrositeDesc', fr: 'micrositeDesc' }, 'facetid_58': { en: 'micrositeDesc2', fr: 'micrositeDesc2' } }
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: { 'facetid_58': { en: 'micrositeDesc2', fr: 'micrositeDesc2' } }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: { 'facetid_58': { en: 'micrositeDesc2', fr: 'micrositeDesc2' } }
      });
      expect(actual3[0]).toEqual({
        objectID: "styleId",
        microsite: [{ en: 'micrositeDesc2', fr: 'micrositeDesc2' }]
      });
    });

    it('should handle microsite deletions correctly when the attribute doesn\'t exist', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false,
            microsite: { 'facetid_58': { en: 'micrositeDesc2', fr: 'micrositeDesc2' } }
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: { 'facetid_58': { en: 'micrositeDesc2', fr: 'micrositeDesc2' } }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: { 'facetid_58': { en: 'micrositeDesc2', fr: 'micrositeDesc2' } },
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        microsite: [{ en: 'micrositeDesc2', fr: 'micrositeDesc2' }]
      }]);
    });
  });

  describe('regular attribute deletion', () => {
    const validDeletionMessage = {
      topic: 'facets-connect-jdbc-STYLE_ITEM_CHARACTERISTICS_ECA',
      value: {
        'STYLEID': 'styleId',
        'CATEGORY': 'category',
        'DESC_ENG': 'attributeValueDescEn',
        'DESC_FR': 'attributeValueDescFr',
        'UPD_FLG': 'F',
        'FKORGANIZATIONNO': '1',
        'CHAR_TY_SUB_TYPE': null,
        'CHARACTERISTIC_TYPE_ID': '1',
        'CHARACTERISTIC_VALUE_ID': '1'
      }
    };

    const parsedFacetDeletionMessage = parseFacetMessage(validDeletionMessage);
    const validDeletionAggregate = [{
      _id: parsedFacetDeletionMessage.styleId,
      facets: [{
        name: parsedFacetDeletionMessage.facetName,
        value: parsedFacetDeletionMessage.facetValue,
        type: parsedFacetDeletionMessage.typeId,
        facetId: parsedFacetDeletionMessage.facetId,
        isMarkedForDeletion: parsedFacetDeletionMessage.isMarkedForDeletion
      }]
    }];

    it('should handle regular attribute deletions correctly when the attribute is not set', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        category: { en: null, fr: null }
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
    });

    it('should handle regular attribute deletions correctly when the attribute already exists', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false,
            category: { en: 'categoryValueEn', fr: 'categoryValueFr' }
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        category: { en: null, fr: null }
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
    });

    it('should handle regular attribute deletions correctly when the attribute doesn\'t exist', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false,
            category: { en: null, fr: null }
          });
        })
      };

      const [failed, actual] = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);
      const actual3 = transformMicrositeAlgoliaRequests(actual);

      expect(failed).toBeEmpty;
      expect(actual).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        category: { en: null, fr: null }
      });
      expect(actual3).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
    });
  });
});
