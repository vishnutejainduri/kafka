require('dotenv').config();
const fs = require('fs');

const debugHistory = require('./debugHistory.json');
const debugLog = require('./debugLog.json')
const getConnectorNames = require('./scripts/getConnectorNames');
const deleteConnectors = require('./scripts/deleteConnectors');

const command = process.argv[2];
const env = process.argv[3];

function handleWriteError(error) {
  if (error) {
    console.log(error);
    throw error;
  }
}

function writeToDebugHistory(data) {
  return fs.writeFile('./debugHistory.json', data, handleWriteError);
}

function writeToDebugLog(data) {
  return fs.writeFile('./debugLog.json', data, handleWriteError);
}

async function debug(_command, _env, writeHistory = writeToDebugHistory, writeLog = writeToDebugLog) {
    const totalDebugs = debugHistory.totalDebugs + 1;
    switch (_command) {
        case 'getAll': {
            const connectorNames = await getConnectorNames(_env);
            const previousHistory = debugHistory.getAll || [];
            const log = {
                number: totalDebugs,
                date: new Date().valueOf(),
                env: _env,
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
            const connectorNames = await getConnectorNames(_env);
            const deletedConnectors = await deleteConnectors(_env, connectorNames);
            const previousHistory = debugHistory.deleteAll || [];
            const data = deletedConnectors.map((result, index) => ({
                name: connectorNames[index],
                success: result instanceof Error ? false : true
            }));
            const log = {
                number: totalDebugs,
                date: new Date().valueOf(),
                env: _env,
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
    }
}

(async function() {
    console.log(await debug(command, env))
})()
