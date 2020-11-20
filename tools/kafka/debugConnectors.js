require('dotenv').config();

const getKubeEnv = require('./lib/getKubeEnv');
const debug = require('./debug');

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
    const kubeParams = getKubeEnv(env);
    const result = await debug({
      command,
      connectionUrl,
      env,
      kubeParams,
      options
    });
    console.log(result);
})()
