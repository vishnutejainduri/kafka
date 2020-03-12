const { createStyle, updateStyle } = require('../APIHelpers');

describe('createStyle', async () => {
  it('throws an error if the given style lacks an ID', () => {
    const styleWithNoId = {};
    return expect(createStyle(styleWithNoId)).rejects.toThrow('Style lacks required key \'id\'');
  });
});

describe('updateStyle', async () => {
  it('throws an error if the given style lacks an ID', () => {
    const styleWithNoId = {};
    return expect(updateStyle(styleWithNoId, 1)).rejects.toThrow('Style lacks required key \'id\'');
  });

  it('throws an error if called without a version number', () => {
    const style = {id: '1'};
    return expect(updateStyle(style)).rejects.toThrow('Invalid arguments: must include \'version\'');
  });
});