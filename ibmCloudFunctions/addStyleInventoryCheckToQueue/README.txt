Whenever we get an inventory update, we want to batch them per style and check if it changes the availability, which
will trigger an update to Algolia. We do this to batch multiple style availability updates together, but also to avoid
triggering multiple updates for a single style in quick succession if multiple SKU inventories get updated around the same
time.