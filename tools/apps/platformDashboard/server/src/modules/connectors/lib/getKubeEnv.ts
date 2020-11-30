export default function (platformEnv) {
  if (platformEnv === 'production') {
    return {
      username: process.env.KUBE_PRODUCTION_USERNAME,
      password: process.env.KUBE_PRODUCTION_PASSWORD,
      tenant: process.env.KUBE_PRODUCTION_TENANT,
      host: process.env.KUBE_PRODUCTION_HOST,
      pathStart: process.env.KUBE_PRODUCTION_PATH_START,
    };
  }

  if (platformEnv === 'staging') {
    return {
      username: process.env.KUBE_STAGING_USERNAME,
      password: process.env.KUBE_STAGING_PASSWORD,
      tenant: process.env.KUBE_STAGING_TENANT,
      host: process.env.KUBE_STAGING_HOST,
      pathStart: process.env.KUBE_STAGING_PATH_START,
    };
  }

  if (platformEnv === 'development') {
    return {
      username: process.env.KUBE_DEVELOPMENT_USERNAME,
      password: process.env.KUBE_DEVELOPMENT_PASSWORD,
      tenant: process.env.KUBE_DEVELOPMENT_TENANT,
      host: process.env.KUBE_DEVELOPMENT_HOST,
      pathStart: process.env.KUBE_DEVELOPMENT_PATH_START,
    };
  }

  throw new Error('No environment provided');
}
