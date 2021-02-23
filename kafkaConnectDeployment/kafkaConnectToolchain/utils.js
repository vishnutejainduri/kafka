const {
  getConnectorBaseObject,
  getConnectorFullName
} = require('../../tools/kafka/utils');
const getConnectorNames = require('../../tools/kafka/scripts/getConnectorNames')
const getConnectorConfig = require('../../tools/kafka/scripts/getConnectorConfig')
const getConnector = require('../../tools/kafka/scripts/getConnector')

const MANDATORY_TOPICS = ['hr-eventstreams-cloudfunctions-binding-beacon','kafka-connect-offsets','kafka-connect-config','kafka-connect-status','platform-connect-config','platform-connect-offsets','platform-connect-status']
const FAILED_STATUS = 'FAILED'

const getConnectorsFromFilenames = async (connectorFilenames) => {
  return Promise.all(connectorFilenames.map(connectorFilename => {
    const connector = getConnectorBaseObject(connectorFilename)
    return connector
  }))
}

const getConnectorsRunning = async (kubeParams) => {
  const runningConnectorNames = await getConnectorNames (kubeParams)
  console.log('Found the following connectors currently running: ', runningConnectorNames)
  return Promise.all(runningConnectorNames.map(async runningConnectorName => {
    const connector = await getConnectorConfig (kubeParams, runningConnectorName)
    return connector
  }))
}

const getConnectorDeploymentDiff = (connectors, runningConnectors, versionKey) => {
  const connectorDeletions = []
  const connectorCreations = []

  connectors.forEach(connector => {
    const existingRunningConnector = runningConnectors.find(runningConnector => parseInt(runningConnector.config.id) === connector.config.id)
    if (existingRunningConnector && parseInt(existingRunningConnector.config[versionKey]) && parseInt(existingRunningConnector.config[versionKey]) > connector.config[versionKey]) {
      console.warn(`Not deploying ${connector.name} version ${connector.config[versionKey]}, running connector ${existingRunningConnector.name} version ${existingRunningConnector.config[versionKey]} is more up to date`)
    } else {
      if (existingRunningConnector && (!parseInt(existingRunningConnector.config[versionKey]) || parseInt(existingRunningConnector.config[versionKey]) <= connector.config[versionKey])) {
        connectorDeletions.push(existingRunningConnector)
      }
      connectorCreations.push(connector)
    }
  })

  runningConnectors.forEach(runningConnector => {
    const existingConnector = connectors.find(connector => parseInt(runningConnector.config.id) === connector.config.id)
    if (!existingConnector) {
      connectorDeletions.push(runningConnector)
    }
  })

  return { connectorDeletions, connectorCreations }
}

const syncTopicsWithConnectors = async (connectorCreations, kafkaAdmin) => {
  const allTopics = await kafkaAdmin.listTopics()

  const topicsToCreate = []
  const topicsToDelete = []
  connectorCreations.forEach(connector => {
    const existingTopic = allTopics.find(topic => connector.config['topic.prefix'] === topic)
    if (!existingTopic && !topicsToCreate.find(topic => topic.topic === connector.config['topic.prefix'])) {
      topicsToCreate.push({
        topic: connector.config['topic.prefix'],
        numPartitions: 1,
        replicationFactor: 3,
        configEntries: [{
          name: 'retention.ms',
          value: '604800000'
        }]
      })
    }
  })

  allTopics.forEach(topic => {
    const existingTopic = connectorCreations.find(connector => connector.config['topic.prefix'] === topic)
    if (!existingTopic && !topicsToDelete.find(deletionTopic => deletionTopic === topic) && !MANDATORY_TOPICS.includes(topic)) topicsToDelete.push(topic)
  })

  if (topicsToCreate.length > 0) {
    console.log(`Found new topics to create. Creating following topics: ${topicsToCreate}`)
    const topicCreationResult = await kafkaAdmin.createTopics({
      topics: topicsToCreate
    })
    if (!topicCreationResult) throw new Error(`Failed to create new topics ${topicsToCreate}`)
  }
  if (topicsToDelete.length > 0) {
    console.log(`Found old topics to delete. Deleting following topics: ${topicsToDelete}`)
    const topicDeletionResult = await kafkaAdmin.deleteTopics({
      topics: topicsToDelete
    })
    if (topicDeletionResult) throw new Error(`Failed to delete topics ${topicsToDelete}`)
  }
}

const checkDeployedConnectorStatuses = (kubeParams, connectors, versionKey) => {
  return Promise.all(connectors.map(async connector => {
    const runningConnectorStatus = await getConnector(kubeParams, getConnectorFullName(connector.name, connector.config[versionKey]))
    const runningConnector = await getConnectorConfig(kubeParams, getConnectorFullName(connector.name, connector.config[versionKey]))
    if (!runningConnectorStatus || !runningConnector) {
      throw new Error(`Connector not deployed: ${connector.name}`)
    }
    const failedTasks = runningConnectorStatus.tasks.filter(({ state }) => state === FAILED_STATUS)
    if (runningConnectorStatus.connector.state === FAILED_STATUS || failedTasks.length > 0) {
      throw new Error(`Connector failing: ${connector.name}`)
    }
    if (parseInt(runningConnector.config.id) !== connector.config.id) {
      throw new Error(`Connector with invalid id deployed: ${connector.name}. Expected id: ${connector.config.id}, found: ${runningConnector.config.id}`)
    }
    if (parseInt(runningConnector.config[versionKey]) !== connector.config[versionKey]) {
      throw new Error(`Connector with invalid version deployed: ${connector.name}. Expected version: ${connector.config[versionKey]}, found: ${runningConnector.config[versionKey]}`)
    }
  }))
}

module.exports = {
  getConnectorsFromFilenames,
  getConnectorsRunning,
  getConnectorDeploymentDiff,
  syncTopicsWithConnectors,
  checkDeployedConnectorStatuses
}
