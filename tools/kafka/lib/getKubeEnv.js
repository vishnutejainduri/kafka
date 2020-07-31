module.exports = function (platformEnv) {
    if (platformEnv === "production") {
        return {
            username: process.env.KUBE_PRODUCTION_USERNAME,
            password: process.env.KUBE_PRODUCTION_PASSWORD,
            tenant: process.env.KUBE_PRODUCTION_TENANT,
            host: process.env.KUBE_PRODUCTION_HOST
        }
    }

    if (platformEnv === "staging") {
        return {
            username: process.env.KUBE_STAGING_USERNAME,
            password: process.env.KUBE_STAGING_PASSWORD,
            tenant: process.env.KUBE_STAGING_TENANT,
            host: process.env.KUBE_STAGING_HOST            
        }
    }

    if (platformEnv === "development") {
        return {
            username: process.env.KUBE_DEVELOPMENT_USERNAME,
            password: process.env.KUBE_DEVELOPMENT_PASSWORD,
            tenant: process.env.KUBE_DEVELOPMENT_TENANT,
            host: process.env.KUBE_DEVELOPMENT_HOST            
        }
    }

    throw new Error("No environment provided");
};
