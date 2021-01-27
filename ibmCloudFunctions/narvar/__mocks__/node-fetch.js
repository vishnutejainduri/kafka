const fetch = async () => ({ ok: true, status: 200, json: async () => ({ order_info: { order_items: [] } }) })

module.exports = {
  default: fetch
}
