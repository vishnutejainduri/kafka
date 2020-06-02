const {
  transformUpdateQueueRequestToAlgoliaUpdates,
  generateStyleUpdatesFromAlgoliaUpdates
} = require('..');
const { parseFacetMessage } = require('../../../lib/parseFacetMessage');

describe('updateAlgoliaFacets', () => {
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

      const actual = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);

      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: []
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: [],
      });
    });

    it('should handle microsite deletions correctly when the attribute already exists', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false,
            microsite: [{ en: 'micrositeDesc', fr: 'micrositeDesc' }, { en: 'micrositeDesc2', fr: 'micrositeDesc2' }]
          });
        })
      };

      const actual = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);

      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: [{ en: 'micrositeDesc2', fr: 'micrositeDesc2' }]
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: [{ en: 'micrositeDesc2', fr: 'micrositeDesc2' }],
      });
    });

    it('should handle microsite deletions correctly when the attribute doesn\'t exist', async () => {
      // stub for styles collection
      const styles = {
        findOne: jest.fn(() => {
          return Promise.resolve({
            isOutlet: false,
            microsite: [{ en: 'micrositeDesc2', fr: 'micrositeDesc2' }]
          });
        })
      };

      const actual = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);

      expect(actual).toEqual([{
        objectID: 'styleId',
        microsite: [{ en: 'micrositeDesc2', fr: 'micrositeDesc2' }]
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        microsite: [{ en: 'micrositeDesc2', fr: 'micrositeDesc2' }],
      });
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

      const actual = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);

      expect(actual).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        category: { en: null, fr: null }
      });
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

      const actual = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);

      expect(actual).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        category: { en: null, fr: null }
      });
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

      const actual = await transformUpdateQueueRequestToAlgoliaUpdates(validDeletionAggregate, styles);
      const actual2 = generateStyleUpdatesFromAlgoliaUpdates(actual);

      expect(actual).toEqual([{
        objectID: 'styleId',
        category: { en: null, fr: null }
      }]);
      expect(actual2[0].updateOne.update.$set).toEqual({
        _id: "styleId",
        category: { en: null, fr: null }
      });
    });
  })
});