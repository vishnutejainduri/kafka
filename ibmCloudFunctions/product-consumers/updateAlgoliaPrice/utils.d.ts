type PriceChangeActivity = 'c' | 'a' | 'd'

type SiteId = '00990' | '00110'

type PriceChange = {
  priceChangeId: string,
  siteId: 'string',
  startDate: Date,
  activityType: PriceChangeActivity,
  newRetailPrice: number
}
