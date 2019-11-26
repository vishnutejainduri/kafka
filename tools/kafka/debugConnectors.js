const getConnectorNames = require('./getConnectorNames');
const deleteConnectors = require('./deleteConnectors');

const command = process.argv[2];
const env = process.argv[3];

function debug(_command, _env) {
    switch (_command) {
        case 'get':
            return getConnectorNames(_env);
        case 'deleteAllConnectors':
            return deleteConnectors(_env, getConnectorNames(_env))
    }
}

(async function() {
    console.log(await debug(command, env))
})()
