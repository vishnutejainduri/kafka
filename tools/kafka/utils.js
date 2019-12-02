function retry(fn, retries = 3) {
    return async function(...args){
        let tries = 0;
        let error = null;
        let response = null;
        while (!response && tries < retries) {
            tries++;
            error = null;
            response = null;
            try {
                response = await fn(...args);
            } catch (err) {
                error = err;
            }
        }
        if (error) {
            throw error;
        }
        return response;
    }
}

// TODO move utils.js to the root and import from there for all ofthe packages
// TODO dedupe this function from ibmCloudFunctions/product-consumers/utils.js
const addErrorHandling = (fn, createError) => {
    if (Promise.resolve(fn) == fn || fn.constructor.name === 'AsyncFunction') {
        return async arg => {
            if (arg instanceof Error) return arg;
            return fn(arg)
                .then(response => {
                    if (response && response.error) throw new Error(response.error);
                    return response;
                })
                .catch(error => createError ? createError(error, arg) : error);
        }
    }

    return arg => {
        if (arg instanceof Error) return arg;
        try {
            const result = fn(arg);
            if (result && result.error) throw new Error(result.error);
            return result;
        } catch(error) {
            return createError ? createError(error, arg) : error;
        }
    };
}

function extractFilenameAndVersion(connectorInstanceName) {
  let version = null;
  let filename = connectorInstanceName;
  const versionMatch = connectorInstanceName.match(/(.*)-v(\d+)/);
  if (versionMatch) {
    version = Number(versionMatch[2]);
    filename = versionMatch[1]
  }
  return {
    filename,
    version
  }
}

function createConnectorObject(
  baseConfig,
  { filename, version, connectionUrl
}) {
  return {
    name: version ? `${filename}-v${version}` : filename,
    config: {
      ...baseConfig,
      "connection.url": connectionUrl
    }
  }
}

function getConnectorBaseObject(filename) {
  try {
    return require(`../../kafkaConnectDeployment/connectors/${filename}`);
  } catch (error) {
    return null;
  }
}

const log = (msg, level = 'log') => {
    if (process.env.NODE_ENV === "test") return;
    if (level.toLowerCase() === "error") {  console.error(msg); }
    else {  console.log(msg); }
}

module.exports = {
    retry,
    addErrorHandling,
    extractFilenameAndVersion,
    getConnectorBaseObject,
    createConnectorObject,
    log
}
