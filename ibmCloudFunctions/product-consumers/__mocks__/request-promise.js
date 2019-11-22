module.exports = async (productApiParams) => {
        if (productApiParams.uri.includes('/inventory/ats/')) {
            return {
              ats: [],
              onlineAts: [],
              _id: 'success'
            }
        } else {
            return {
              _id: 'success'
            }
        }
}
