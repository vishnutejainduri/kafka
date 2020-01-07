module.exports = function (platformEnv) {
    if (platformEnv === "prod") {
        return {
            username: process.env.KUBE_PROD_USERNAME,
            password: process.env.KUBE_PROD_PASSWORD,
            tenant: process.env.KUBE_PROD_TENANT,
            host: process.env.KUBE_PROD_HOST
        }
    }

    if (platformEnv === "dev") {
        return {
            username: process.env.KUBE_DEV_USERNAME,
            password: process.env.KUBE_DEV_PASSWORD,
            tenant: process.env.KUBE_DEV_TENANT,
            host: process.env.KUBE_DEV_HOST            
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
