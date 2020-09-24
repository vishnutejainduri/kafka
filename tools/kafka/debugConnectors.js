require('dotenv').config();
const fs = require('fs');

const getInfo = require('./scripts/getInfo');
const getConnector = require('./scripts/getConnector');
const restartConnector = require('./scripts/restartConnector');
const restartTask = require('./scripts/restartTask');
const getConnectorNames = require('./scripts/getConnectorNames');
const deleteConnectors = require('./scripts/deleteConnectors');
const createConnectors = require('./scripts/createConnectors');
const { extractFilenameAndVersion } = require('./utils');
const getKubeEnv = require('./lib/getKubeEnv');

function handleWriteError(error) {
  if (error) {
    console.log(error);
    throw error;
  }
}

async function debug({
  command,
  connectionUrl,
  env,
  kubeParams,
  options,
  writeHistory,
  writeLog,
  totalDebugs
}) {
    switch (command) {
        case 'getInfo': {
          return await getInfo(env);
        }
        case 'get': {
          const connectorNames = options[0] && options[0].split(',');
          return (await Promise.all(connectorNames.map(name => getConnector(kubeParams, name)))).map(info => ({ ...info, tasks: JSON.stringify(info.tasks)}));
        }
        case 'restart': {
          const connectorNames = options[0] && options[0].split(',');
          return (await Promise.all(connectorNames.map(name => restartConnector(kubeParams, name))));
        }
        case 'getTasks': {
          const connectorNames = options[0] && options[0].split(',');
          return (await Promise.all(connectorNames.map(name => getConnector(kubeParams, name)))).map(({ tasks }) => tasks);
        }
        case 'restartFailedTasks': {
          const connectorNames = options[0] && options[0].split(',');
          console.log("Restarting failed tasks for connectors: ", connectorNames)
          const connectors = await Promise.all(connectorNames.map(name => getConnector(kubeParams, name)))
          return connectors.map(({ name, tasks }) => {
            const failedTasks = tasks.filter(({ state }) => state === 'FAILED')
            if (failedTasks.length) {
              console.log(`Found failed tasks for connector ${name}: `, failedTasks.map(({ id }) => id).join(", "))
            } else {
              console.log(`Found no failed tasks for connector ${name}.`)
            }
            return failedTasks.map(({ id }) => restartTask(kubeParams, name, id))
          });
        }
        case 'getAll': {
            const connectorNames = await getConnectorNames(kubeParams);
            const previousHistory = debugHistory.getAll || [];
            const log = {
                number: totalDebugs,
                date: new Date().valueOf(),
                env,
                data: connectorNames
            };
            previousHistory.push(log);
            writeLog(JSON.stringify({
              ...debugLog,
              getAll: log
            }));
            writeHistory(JSON.stringify({
                ...debugHistory,
                totalDebugs,
                getAll: previousHistory
            }));
            return connectorNames;
        }
        case 'deleteSome': {
          // TODO add a confirmation with y/N step
          const connectorNames = options[0] && options[0].split(',');
          const deletedConnectors = await deleteConnectors(env, connectorNames);
          const previousHistory = debugHistory.deleteSome || [];
          const data = deletedConnectors.map((result, index) => ({
              name: connectorNames[index],
              success: result instanceof Error ? false : true,
              error: result instanceof Error ? result.message : null
          }));
          const log = {
              number: totalDebugs,
              date: new Date().valueOf(),
              env,
              data
          };
          previousHistory.push(log);
          writeLog(JSON.stringify({
            ...debugLog,
            deleteSome: log
          }));
          writeHistory(JSON.stringify({
              ...debugHistory,
              totalDebugs,
              deleteSome: previousHistory
          }));
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
          const createdConnectors = await createConnectors(env, deletedConnectorsFilenamesAndVersions, connectionUrl);
          const previousHistory = debugHistory.recreateDeleted || [];
          const data = createdConnectors.map((result, index) => ({
              name: deletedConnectorsFilenamesAndVersions[index].filename,
              success: result instanceof Error ? false : true,
              error: result instanceof Error ? result.message : null
          }));
          const log = {
              number: totalDebugs,
              date: new Date().valueOf(),
              env,
              data
          };
          previousHistory.push(log);
          writeLog(JSON.stringify({
            ...debugLog,
            recreateDeleted: log
          }));
          writeHistory(JSON.stringify({
              ...debugHistory,
              totalDebugs,
              recreateDeleted: previousHistory
          }));
          return createdConnectors;
        }
    }
}

const debugHistory = require('./debugHistory.json');
const debugLog = require('./debugLog.json');

function writeToDebugHistory(data) {
  return fs.writeFile('./debugHistory.json', data, handleWriteError);
}

function writeToDebugLog(data) {
  return fs.writeFile('./debugLog.json', data, handleWriteError);
}

const connectionUrls = {
  'production': process.env['JESTA_PRODUCTION'],
  'staging': process.env['JESTA_STAGING'],
  'development': process.env['JESTA_DEVELOPMENT']
};

(async function() {
    const command = process.argv[2];
    const env = process.argv[3];
    const connectionUrl = connectionUrls[env];
    const options = process.argv.slice(4);
    const totalDebugs = debugHistory.totalDebugs + 1;
    const kubeParams = getKubeEnv(env);
    const result = await debug({
      command,
      connectionUrl,
      env,
      kubeParams,
      options,
      writeHistory: writeToDebugHistory,
      writeLog: writeToDebugLog,
      totalDebugs
    });
    console.log(result);
})()
