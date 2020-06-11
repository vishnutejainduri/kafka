type PriceChangeActivity = 'C' | 'A' | 'D'

type SiteId = '00990' | '00110'

type PriceChange = {
  priceChangeId: string,
  siteId: SiteId,
  startDate: Date,
  activityType: PriceChangeActivity,
  newRetailPrice: number
}

type ApplicablePriceChanges = {
  [siteId: SiteId]: PriceChange
}
