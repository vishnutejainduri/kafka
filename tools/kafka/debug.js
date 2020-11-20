const getInfo = require('./scripts/getInfo');
const getConnector = require('./scripts/getConnector');
const restartConnector = require('./scripts/restartConnector');
const restartTask = require('./scripts/restartTask');
const getConnectorNames = require('./scripts/getConnectorNames');
const deleteConnectors = require('./scripts/deleteConnectors');
const createConnectors = require('./scripts/createConnectors');
const { extractFilenameAndVersion } = require('./utils');

async function debug({
  command,
  connectionUrl,
  kubeParams,
  options = []
}) {
    switch (command) {
        case 'getInfo': {
          return getInfo(kubeParams);
        }
        case 'get': {
          const connectorNames = options[0] && options[0].split(',');
          return (await Promise.all(connectorNames.map(name => getConnector(kubeParams, name))))
            .map(info => ({ ...info, tasks: JSON.stringify(info.tasks)}));
        }
        case 'restart': {
          const connectorNames = options[0] && options[0].split(',');
          return Promise.all(connectorNames.map(name => restartConnector(kubeParams, name)));
        }
        case 'getTasks': {
          const connectorNames = options[0] && options[0].split(',');
          return (await Promise.all(connectorNames.map(name => getConnector(kubeParams, name))))
            .map(({ tasks }) => tasks);
        }
        case 'restartFailedTasks': {
          const connectorNames = options[0] && options[0].split(',');
          console.log("Restarting failed tasks for connectors: ", connectorNames)
          const connectors = await Promise.all(connectorNames.map(name => getConnector(kubeParams, name)))
          return Promise.all(connectors.map(({ name, tasks }) => {
            const failedTasks = tasks.filter(({ state }) => state === 'FAILED')
            if (failedTasks.length) {
              console.log(`Found failed tasks for connector ${name}: `, failedTasks.map(({ id }) => id).join(", "))
            } else {
              console.log(`Found no failed tasks for connector ${name}.`)
            }
            return Promise.all(failedTasks.map(({ id }) => restartTask(kubeParams, name, id)))
          }));
        }
        case 'getAll': {
            const connectorNames = await getConnectorNames(kubeParams);
            return connectorNames;
        }
        case 'deleteSome': {
          // TODO add a confirmation with y/N step
          const connectorNames = options[0] && options[0].split(',');
          const deletedConnectors = await deleteConnectors(kubeParams, connectorNames);
          return deletedConnectors;
        }
        case 'recreateDeleted': {
          // accepts two optional arguments:
          // a. a list of connector names separated by comma
          // b. a number denoting the increase in version
          // e.g. passing `medias-jdbc-source-v8,skus-jdbc-source 1`
          // will create "medias-jdbc-source-v9" and "skus-jdbc-source-v1"
          const connectorInstancesPassedAsArgument = options[0] && options[0].split(',');
          const versionIncrease = options[1] ? Number(options[1]) : null;
          const deletedConnectorsFilenamesAndVersions = (connectorInstancesPassedAsArgument).map(connectorInstances => extractFilenameAndVersion(connectorInstances, versionIncrease));
          const createdConnectors = await createConnectors(kubeParams, deletedConnectorsFilenamesAndVersions, connectionUrl);
          return createdConnectors;
        }
    }
}

module.exports = debug;
