const { writeFileSync } = require('fs')
const { getCollection, disconnect } = require('./client')

const getIdsOfStylesWithPromoStickersThatShouldBeDeleted = async () => {
  const collection = await getCollection('styles')
  const styles = await (await collection.find({
    isEndlessAisle: true,
    'promotionalSticker.en': 'Online Only'
    })).toArray()
  return styles.map(style => style._id)
}

const removePromoStickerFromStylesByStyleId = async styleIds => {
  const collection = await getCollection('styles')
  return collection.updateMany(
    { _id: { $in: styleIds } },
    { $unset: {  promotionalSticker: "" } }
  )
}

const saveIdsOfStylesWithPromoStickersThatShouldBeDeleted = async () => {
  const styleIds = await getIdsOfStylesWithPromoStickersThatShouldBeDeleted()
  writeFileSync('./promo-stickers-to-delete-by-style-id.txt', JSON.stringify(styleIds))
  await disconnect()
}
