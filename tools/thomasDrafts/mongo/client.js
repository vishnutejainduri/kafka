require('dotenv').config()
const { MongoClient } = require('mongodb');

const dbName = process.env.DB_NAME

const options = {
  ssl: true,
  sslValidate: true,
  sslCA: [Buffer.from(process.env.MONGO_CERTIFICATE_BASE_64, 'base64')],
  useNewUrlParser: true,
  useUnifiedTopology: true
}

let client = null
let db = null

const getClient = async () => {
  if (!client) {
    client = await MongoClient.connect(process.env.MONGO_URI, options)
    console.log('Connected to MongoDb')
  }
  return client
}

const getDb = async () => {
  if (!db) {
    client = await getClient()
    db = await client.db(dbName)
    console.log(`Connected to ${dbName}`)
  }
  return db
}

const getCollection = async name => {
  const db = await getDb()
  console.log(`Got collection ${name}`)
  return db.collection(name)
}

const disconnect = async () => {
  const client = await getClient()
  await client.close()
  console.log('Disconnected from MongoDB')
}

module.exports = {
  getCollection,
  disconnect
}
