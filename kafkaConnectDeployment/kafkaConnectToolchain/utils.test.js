const {
  getConnectorsFromFilenames,
  getConnectorDeploymentDiff,
  syncTopicsWithConnectors
} = require('./utils') 
const { Kafka } = require('kafkajs')

jest.mock('kafkajs')

const validRunningConnector = {
  name: 'name',
  config: {
    id: '1',
    versionDevelopment: '1',
    versionStaging: '1',
    versionProduction: '1',
    'topic.prefix': 'topicName'
  }
}

const validConnector = {
  name: 'name',
  config: {
    id: 1,
    versionDevelopment: 1,
    versionStaging: 1,
    versionProduction: 1,
    'topic.prefix': 'topicName'
  }
}

describe('getConnectorsFromFilenames', function() {
  it('list of file names returns their contents', async function() {
    const fileNames = ['skuinventory-jdbc-source.json']
    const result = await getConnectorsFromFilenames(fileNames)
    expect(result).toBeInstanceOf(Object)
  });
});

describe('getConnectorDeploymentDiff', function() {
  it('1 new connector no existing connectors; returns 1 new connector', async function() {
    const connectors = [validConnector]
    const runningConnectors = []
    const result = await getConnectorDeploymentDiff(connectors, runningConnectors, 'versionDevelopment')
    expect(result).toEqual({
      connectorCreations: connectors,
      connectorDeletions: []
    })
  });
  it('1 new connector and 1 existing connector that is the same; deletes existing creates new connector', async function() {
    const connectors = [validConnector]
    const runningConnectors = [validRunningConnector]
    const result = await getConnectorDeploymentDiff(connectors, runningConnectors, 'versionDevelopment')
    expect(result).toEqual({
      connectorCreations: connectors,
      connectorDeletions: runningConnectors
    })
  });
  it('1 new connector and 1 existing connector that is different; deletes existing creates new connector', async function() {
    const connectors = [validConnector]
    const runningConnectors = [{ ...validRunningConnector, config: { ...validRunningConnector.config, id: '2' } }]
    const result = await getConnectorDeploymentDiff(connectors, runningConnectors, 'versionDevelopment')
    expect(result).toEqual({
      connectorCreations: connectors,
      connectorDeletions: runningConnectors
    })
  });
  it('1 new connector and 1 existing connector that is the same but newer version; does nothing', async function() {
    const connectors = [{ ...validConnector, config: { ...validConnector.config, versionDevelopment: '2' } }]
    const runningConnectors = [{ ...validRunningConnector, config: { ...validRunningConnector.config, versionDevelopment: '3' } }]
    const result = await getConnectorDeploymentDiff(connectors, runningConnectors, 'versionDevelopment')
    expect(result).toEqual({
      connectorCreations: [],
      connectorDeletions: []
    })
  });
});

describe('syncTopicsWithConnectors', function() {
  const kafka = new Kafka({})
  const kafkaAdmin = kafka.admin()

  it('given a connector with a valid topic it executes as expected', async function() {
    expect(syncTopicsWithConnectors.bind(null, [validConnector], kafkaAdmin)).not.toThrow()
  });
  it('given a connector with a new valid topic it executes as expected', async function() {
    expect(syncTopicsWithConnectors.bind(null, [{ ...validConnector, config: { ...validConnector.config, 'topic.prefix': 'newTopicName' } }], kafkaAdmin)).not.toThrow()
  });
});
