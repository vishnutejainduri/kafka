require('dotenv').config();
const fs = require('fs');

const getConnectorNames = require('./scripts/getConnectorNames');
const deleteConnectors = require('./scripts/deleteConnectors');
const createConnectors = require('./scripts/createConnectors');
const { extractFilenameAndVersion } = require('./utils');

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
  options,
  writeHistory,
  writeLog,
  totalDebugs
}) {
    switch (command) {
        case 'getAll': {
            const connectorNames = await getConnectorNames(env);
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
        case 'deleteAll': {
            // TODO add a confirmation with y/N step
            const connectorInstancesPassedAsArgument = options[0] && options[0].split(',');
            const connectorNames = connectorInstancesPassedAsArgument || await getConnectorNames(env);
            const deletedConnectors = await deleteConnectors(env, connectorNames);
            const previousHistory = debugHistory.deleteAll || [];
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
              deleteAll: log
            }));
            writeHistory(JSON.stringify({
                ...debugHistory,
                totalDebugs,
                deleteAll: previousHistory
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
          const deletedConnectorsFilenamesAndVersions = (
            connectorInstancesPassedAsArgument 
            || debugLog.deleteAll.data.map(data => data.name)
          ).map(connectorInstances => extractFilenameAndVersion(connectorInstances, versionIncrease));
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
const debugLog = require('./debugLog.json')

function writeToDebugHistory(data) {
  return fs.writeFile('./debugHistory.json', data, handleWriteError);
}

function writeToDebugLog(data) {
  return fs.writeFile('./debugLog.json', data, handleWriteError);
}

const connectionUrls = {
  'prod': process.env['JESTA_PROD'],
  'dev': process.env['JESTA_DEV'],
  'development': process.env['JESTA_DEVELOPMENT']
};

(async function() {
    const command = process.argv[2];
    const env = process.argv[3];
    const connectionUrl = connectionUrls[env];
    const options = process.argv.slice(4);
    const totalDebugs = debugHistory.totalDebugs + 1;
    const result = await debug({
      command,
      connectionUrl,
      env,
      options,
      writeHistory: writeToDebugHistory,
      writeLog: writeToDebugLog,
      totalDebugs
    });
    console.log(result);
})()
