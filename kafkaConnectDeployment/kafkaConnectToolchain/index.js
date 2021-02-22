(require('dotenv').config())
const { Kafka } = require('kafkajs')
const fs = require('fs')
const util = require('util')
const {
  getConnectorsFromFilenames,
  getConnectorsRunning,
  getConnectorDeploymentDiff,
  syncTopicsWithConnectors,
  checkDeployedConnectorStatuses
} = require('./utils')
const deleteConnectors = require('../../tools/kafka/scripts/deleteConnectors')
const createConnector = require('../../tools/kafka/scripts/createConnector')

const readdir = util.promisify(fs.readdir)

const validEnvironments = ['Development', 'Staging', 'Production']

const kafka = new Kafka({
  brokers: process.env.KAFKA_BROKERS.split(','),
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD
  }
})

const kubeParams = {
  tenant: process.env.KUBE_TENANT,
  username: process.env.KUBE_USERNAME,
  password: process.env.KUBE_PASSWORD,
  host: process.env.KUBE_HOST,
  pathStart: process.env.KUBE_PATH
}
const connectionUrl = `jdbc:oracle:thin:${process.env.TARGET_USERNAME}/${process.env.TARGET_PASSWORD}@//${process.env.TARGET_IP}:1521/${process.env.TARGET_SERVICE_NAME}`
const currentEnvironment = process.env.ENVIRONMENT

const main = async () => {
  try {
    if (!validEnvironments.includes(currentEnvironment)) {
      console.error(`Invalid environment provided: ${currentEnvironment}, must be one of the following values: ${validEnvironments}`)
      process.exit(1)
    }
    const connectorVersionKey = `version${currentEnvironment}`

    const connectorFilenames = await readdir('../connectors')  
    console.log('Found the following connector configs to deploy: ', connectorFilenames)

    const connectors = await getConnectorsFromFilenames(connectorFilenames)
    const duplicateConnectors = connectors.filter((connector, index) => connectors.findIndex(currentConnector => currentConnector.config.id === connector.config.id) !== index)
    if (duplicateConnectors.length > 0) {
      console.error(`Cannot deploy connectors, duplicate connector ids present in deployment. ${duplicateConnectors.map(duplicateConnector => duplicateConnector.config.id)}`)
      process.exit(1)
    }

    const runningConnectors = await getConnectorsRunning (kubeParams)

    console.log('Starting deployment...')

    const { connectorDeletions, connectorCreations } = getConnectorDeploymentDiff (connectors, runningConnectors, connectorVersionKey)

    const kafkaAdmin = kafka.admin()
    await kafkaAdmin.connect()
    await syncTopicsWithConnectors (connectorCreations, kafkaAdmin)

    // we attempt to delete and create whatever we can, and only throw errors afterwards. 
    // This maximizes how much we're able to deploy and makes sure we don't delete almost all connectors but not even attempt to create
    // which could just leave us with 0 connectors sometimes
    const deleteResults = await Promise.all(connectorDeletions.map(async connector => deleteConnectors(kubeParams, [connector.name])))

    // we don't care about the kafka connect api results of creation as they can be misleading
    // they can return errors on timeouts but actually successfully deploy the connector
    // the function `checkDeployedConnectorStatuses` will do a final check
    // if we have successfully deleted and `checkDeployedConnectorStatuses` finds all connectors in running status the deployment must have been
    // successful no matter what the api returned
    await Promise.all(connectorCreations.map(async connector => createConnector(kubeParams, connector, connectionUrl, connectorVersionKey)))

    const deleteErrors = deleteResults.filter(result => result instanceof Error)
    if (deleteErrors.length > 0) {
      console.error(`Connector deletions failed with the following errors: ${deleteErrors}`)
      process.exit(1)
    }
  
    console.log('Validating deployment...') 
    await checkDeployedConnectorStatuses (kubeParams, connectorCreations, connectorVersionKey) 
    console.log('Deployment validated')

    console.log('Deployment successful')
    process.exit(0)
  } catch (error) {
    console.error(`Deployment failed with error: ${error}`)
    process.exit(1)
  }
}

main()
