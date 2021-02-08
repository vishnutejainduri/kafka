const fetch = require('node-fetch').default
const base64 = require('base-64')
const dotenv = require('dotenv')
dotenv.config()

const fs = require('fs');
const wstreamOutput = fs.createWriteStream('results.csv');

const MISSING_NARVAR_ORDER_STRING = 'No Order Information found for Order Number'

const sleep = async (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const getNarvarShipmentItemCount = (narvarOrder) => {
  let totalLines = 0
  narvarOrder.order_info.shipments && narvarOrder.order_info.shipments.forEach(shipment => {
    totalLines += shipment.items_info.length
  })
  return totalLines
}

const makeNarvarRequest = async (narvarCreds, path, options) => {
  const response = await fetch(narvarCreds.baseUrl + path, options)
  const result = await response.json()
  if (response.ok) {
    if (result.status === 'FAILURE') {
      throw new Error(JSON.stringify(result))
    }
    return result
  }
  throw new Error(JSON.stringify(result))
}

const getNarvarOrder = async (narvarCreds, orderNumber) => {
  const options = {
    headers: {
      Authorization: `Basic ${base64.encode(narvarCreds.username + ':' + narvarCreds.password)}`,
      'Content-Type': 'application/json'
    },
    method: 'GET' 
  }

  try {
    const response = await makeNarvarRequest(narvarCreds, `/orders/${orderNumber}`, options)
    return response
  } catch (error) {
    if (error.message.includes(MISSING_NARVAR_ORDER_STRING)) return null // Narvar doesn't send a 404, only way to determine a missing order is via error message string match
    throw error
  }
}

const narvarCreds = {
  username: process.env.NARVAR_USERNAME,
  password: process.env.NARVAR_PASSWORD,
  baseUrl: 'https://ws-st01.narvar.qa/api/v1'
}

fs.readFile('./export.csv', 'utf-8', async (err, data) => {
  let dataRows = data.split('\n');
  dataRows = dataRows.slice(1)
  wstreamOutput.write('ORDER_NUMBER,JESTA_LINES,NARVAR_LINES,ERROR\n');
  for (let i = 0; i < dataRows.length; i = i + 1000) {
    let orderRows = dataRows.slice(i,i+999)
    console.log(`Comparing ${orderRows.length} orders`)
    await Promise.all(orderRows.map(async orderRow => {
      orderRow = orderRow.replace(/"/g,'')
      if (orderRow && orderRow !== ',') {
        try {
          orderRow = orderRow.split(',')
          const orderNumber = orderRow[0]
          const lineItemCount = parseInt(orderRow[1])
          const shipmentItemCount = parseInt(orderRow[2]) || 0

          const narvarOrder = await getNarvarOrder (narvarCreds, orderNumber)
          console.log('comparing with narvar order...', orderNumber)
          if (!narvarOrder) {
            wstreamOutput.write(`${orderNumber},,,ORDER_MISSING\n`);
          } else {
            if (narvarOrder.order_info.order_items.length !== lineItemCount) {
              wstreamOutput.write(`${orderNumber},${lineItemCount},${narvarOrder.order_info.order_items.length},LINE_ITEM_MISMATCH\n`);
            }
            const narvarShipmentItemCount = getNarvarShipmentItemCount (narvarOrder)
            if (narvarShipmentItemCount !== shipmentItemCount) {
              wstreamOutput.write(`${orderNumber},${shipmentItemCount},${narvarShipmentItemCount},SHIPMENT_ITEM_MISMATCH\n`);
            }
          }
        } catch (error) {
          console.error(error);
          wstreamOutput.write(`${orderNumner},,,${error}\n`);
        }
      }
    }))
    console.log('going to sleep to give narvar a quick break zzzzzzzzzzz....')
    await sleep(10000)
  }
});
