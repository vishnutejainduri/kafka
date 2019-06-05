This function is used to add incoming Media Containers to a Mongo collection in order to process them later for Algolia.
We have two streams of data that are relevant to images - Medias and Media Containers. We have no way of guaranteeing
that the other will be processed when we get a message for one of them. To solve this synchronization problem, we only
monitor Media Containers and check on a cron in another function to see if we have both parts of the data before sending
it to Algolia.