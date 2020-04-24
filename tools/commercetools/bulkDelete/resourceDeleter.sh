PROJECT_KEY=<PROJECT_KEY>
ACCESS_TOKEN=<ACCESS_TOKEN>

# delete products (including variants)
resource-deleter -p $PROJECT_KEY -r products --api-url "https://api.us-central1.gcp.commercetools.com" --authUrl "https://auth.us-central1.gcp.commercetools.com" --accessToken $ACCESS_TOKEN

# delete custom objects (such as barcodes)
resource-deleter -p $PROJECT_KEY -r customObjects --api-url "https://api.us-central1.gcp.commercetools.com" --authUrl "https://auth.us-central1.gcp.commercetools.com" --accessToken $ACCESS_TOKEN

# delete categories
resource-deleter -p $PROJECT_KEY -r categories --api-url "https://api.us-central1.gcp.commercetools.com" --authUrl "https://auth.us-central1.gcp.commercetools.com" --accessToken $ACCESS_TOKEN

# delete carts
resource-deleter -p $PROJECT_KEY -r carts --api-url "https://api.us-central1.gcp.commercetools.com" --authUrl "https://auth.us-central1.gcp.commercetools.com" --accessToken $ACCESS_TOKEN

# delete orders
resource-deleter -p $PROJECT_KEY -r orders --api-url "https://api.us-central1.gcp.commercetools.com" --authUrl "https://auth.us-central1.gcp.commercetools.com" --accessToken $ACCESS_TOKEN
