const fetch = require('node-fetch')

const getAccessToken = async ({ ctClientId, ctClientSecret, ctAuthUrl }) => {
  const response = await fetch(`${ctAuthUrl}/oauth/token?grant_type=client_credentials`, {
    method: 'post',
    headers: {
      authorization: `Basic ${Buffer.from(`${ctClientId}:${ctClientSecret}`).toString('base64')}`
    }
  })

  return (await response.json()).access_token
}

module.exports = {
  getAccessToken
}