import { request as _request } from 'https';

import getSessionToken from '../lib/getSessionToken';
import utils from '../utils';

const { formatPathStart, retry } = utils;

async function callRestartTask({
  kubeHost,
  pathStart,
  token,
  connectorName,
  taskId,
}) {
  const options = {
    hostname: kubeHost.replace('https://', ''),
    port: 443,
    path: `${formatPathStart(
      pathStart,
    )}/connectors/${connectorName}/tasks/${taskId}/restart`,
    method: 'POST',
    headers: {
      Authorization: `${token.token_type} ${token.access_token}`,
    },
  };

  return new Promise(function (resolve, reject) {
    const request = _request(options, function (res) {
      let body = '';
      res.on('data', function (data) {
        body += data;
      });
      res.on('end', function () {
        resolve({
          body,
          statusCode: res.statusCode,
        });
      });
      res.on('error', function (error) {
        reject(error);
      });
    });

    request.end();
  });
}

async function restartTask(kubeParams, connectorName, taskId) {
  const token = await retry(getSessionToken)(kubeParams);
  const { body, statusCode } = (await retry(callRestartTask)({
    kubeHost: kubeParams.host,
    pathStart: kubeParams.pathStart,
    token,
    connectorName,
    taskId,
  })) as any;
  //here we have the full response, html or json object
  let info = null;
  let error = null;

  if (statusCode < 200 || statusCode >= 300) {
    error = new Error(
      `Server call not successful with status code: ${statusCode}`,
    );
    error.debugInfo = { body };
  } else {
    if (!body) return statusCode;
    try {
      info = JSON.parse(body);
    } catch (parsingError) {
      error = parsingError;
      error.debugInfo = { body };
    }
  }

  if (error) {
    throw error;
  }

  return info;
}

export default restartTask;
