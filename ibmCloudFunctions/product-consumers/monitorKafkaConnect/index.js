const getConnectorNames = require('../../../tools/kafka/scripts/getConnectorNames');
const getConnector = require('../../../tools/kafka/scripts/getConnector');
const restartConnector = require('../../../tools/kafka/scripts/restartConnector');
const restartTask = require('../../../tools/kafka/scripts/restartTask');
const { log } = require('../utils');

const FAILED_STATUS = 'FAILED'

global.main = async function main ({
    kubeUsername: username,
    kubePassword: password,
    kubeTenant: tenant,
    kubeHost: host,
    kafkaConnectKubePathStart: pathStart
}) {
    const kubeParams = {
        username,
        password,
        tenant,
        host,
        pathStart
    }
    const connectorNames = await getConnectorNames(kubeParams)
    let connectors = await Promise.all(connectorNames.map(name => getConnector(kubeParams, name)))
    const failedConnectors = connectors.filter(({ connector }) => connector.state === FAILED_STATUS)
    if (failedConnectors.length) {
        log.warn("Found failed connectors: ", failedConnectors.map(({ name }) => name).join(", "))
    } else {
        log("Found no failed connectors.")
    }
    // first make sure none of the connectors are in 'FAILED' status by restarting the failed connectors
    for (const failedConnector of failedConnectors) {
        log("Restarting failed connector: ", failedConnector.name)
        await restartConnector(kubeParams, failedConnector.name)
        log("Successfully restarted failed connector: ", failedConnector.name)
    }

    // get updated status of the connectors
    connectors = await Promise.all(connectorNames.map(name => getConnector(kubeParams, name)))
    for (const connector of connectors) {
        const failedTasks = connector.tasks.filter(({ state }) => state === FAILED_STATUS)
        if (failedTasks.length) {
            log.warn(`Found failed tasks for connector ${connector.name}: `, failedTasks.map(({ id }) => id).join(", "))
        } else {
            log(`Found no failed tasks for connector ${connector.name}.`)
        }
        for (const failedTask of failedTasks) {
            log(`Restarting failed task for connector ${connector.name}: `, failedTask.id)
            await restartTask(kubeParams, connector.name, failedTask.id)
            log(`Successfully restarted failed task for connector ${connector.name}: `, failedTask.id)
        }
    }
}

module.exports = global.main
