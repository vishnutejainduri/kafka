const bent = require('bent');
const btoa = require('btoa');

global.main = async function (params) {
    const {
        connectHost,
        authHost,
        authUser,
        authPassword,
        authTenantId
    } = params;

    const FAILED_STATE = 'FAILED';

    const getAuthJSON = bent(
        `${authHost}`,
        'POST',
        { Authorization: 'Basic ' + btoa(`${authUser}:${authPassword}`), 'Content-Type': 'application/json' },
        'json'
    );
    const authResponse = await getAuthJSON(`/oauth/v4/${authTenantId}/token`, { 'grant_type': 'client_credentials' });

    const getJSON = bent(`${connectHost}`, 'json', { Authorization: `Bearer ${authResponse.access_token}` });
    const connectors = await getJSON(`/connectors`);
    const statusCheckRequests = connectors.map(connector =>
        getJSON(`/connectors/${connector}/status`)
            .catch(err => { error: true, err })
    );

    return Promise.all(statusCheckRequests).then((statusChecks) => {
        console.log(statusChecks);
        const failedChecks = statusChecks
            .filter(statusCheck => statusCheck.error || statusCheck.connector.state === FAILED_STATE 
              || statusCheck.tasks.filter((task) => task.state === FAILED_STATE).length > 0)
            .map(statusCheck => statusCheck.name)
            .join(', ');
        const status = failedChecks
            ? `Some connectors are currently failing: ${failedChecks}`
            : 'All connectors are currently running.';


        return {
            statusCode: failedChecks ? 500 : 200,
            headers: { 'Content-Type': 'application/json' },
            body: { status }
        };
    });
}

module.exports = global.main;
