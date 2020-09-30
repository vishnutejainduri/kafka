const { getCtHelpers } = require('./client.js');

const userInput = process.argv.slice(2);
const environment = userInput[0];

if (environment !== 'dev' && environment !== 'development' && environment !== 'staging' && environment !== 'production' && environment !== 'prod') {
  console.log ('Invalid environment provided');
  return;
}

const { client: ctClient, requestBuilder } = getCtHelpers (environment);

/**
 * @param {string} lineItemId 
 */
const getSetLineItemTaxAmountAction = lineItemId => ({
  action: 'setLineItemTaxAmount',
  lineItemId,
  externalTaxAmount: {
    totalGross: {
      type: 'centPrecision',
      currencyCode: 'CAD',
      centAmount: Math.floor(Math.random() * 1000),
      fractionDigits: 2,
    },
    taxRate: {
      name: 'HST',
      includedInPrice: false,
      country: 'CA',
      state: 'ON',
      amount: 0.13
    }
  }
})

/**
 * @param {string} lineItemId 
 */
const getSetLineItemCustomFieldsAction = lineItemId => ({
  action: 'setLineItemCustomType',
  lineItemId,
  type: {
    key: 'customLineItemFields'
  },
  fields: {
    isGift: false,
    barcodeData: [
      {
        typeId: 'key-value-document',
        id: '788f4dc4-049a-4cef-9cdd-eb13293714de'
      }
    ],
    salespersonId: 355216,
    lineShippingCharges: {
      type: 'centPrecision',
      currencyCode: 'CAD',
      centAmount: 550,
      fractionDigits: 2
    },
    lineTotalTax: {
      type: 'centPrecision',
      currencyCode: 'CAD',
      centAmount: 2535,
      fractionDigits: 2
    }
  }
})

/**
 * @param {string} id
 */
const getAddPaymentAction = id => ({
  action: 'addPayment',
  payment: {
    typeId: 'payment',
    id
  }
})

const createPayment = async () => {
  return (await ctClient.execute({
    method: 'POST',
    uri: requestBuilder.payments.build(),
    body: JSON.stringify({
      amountPlanned: {
        currencyCode: 'CAD',
        centAmount: 54380
      },
      custom: {
        type: {
          key: 'customPaymentFields'
        },
        fields: {
          cardReferenceNumber: '19',
          cardExpiryDate: '0525',
          cardNumber: '1212',
          authorizationNumber: '12345'
        }
      }
    })
  })).body
}

const addPaymentToCart = async cart => {
  const payment = await createPayment()

  const body = {
    version: cart.version,
    actions: [
      getAddPaymentAction(payment.id)
    ]
  }

  return (await ctClient.execute({
    method: 'POST',
    uri: requestBuilder.carts.byId(cart.id).build(),
    body: JSON.stringify(body)
  })).body
  
}

const addTaxesToCart = async cart => {
  const body = {
    version: cart.version,
    actions: [
      ...cart.lineItems.map(lineItem => getSetLineItemTaxAmountAction(lineItem.id)),
      ...cart.lineItems.map(lineItem => getSetLineItemCustomFieldsAction(lineItem.id))
    ]
  }

  return (await ctClient.execute({
    method: 'POST',
    uri: requestBuilder.carts.byId(cart.id).build(),
    body: JSON.stringify(body)
  })).body
}

const generateCompleteTestCart = async () => {
  const body = {
    locale: 'en-CA',
    currency: 'CAD',
    taxMode: 'ExternalAmount',
    customerEmail: 'newUserWithCapitialLettersInEmailAddress@test.com',
    // customerId: '48be3e25-9cc0-4c8c-9fa1-35d0bf6c2aa7',
    lineItems: [
      {
        sku: '-2864801',
        quantity: 2,
      },
    ],
    shippingAddress: {
      country: 'CA',
      state: 'ON',
      city: 'Toronto',
      firstName: 'Harry',
      lastName: 'Rosen',
      postalCode: 'M5B 2H6',
      phone: '(416) 598-8885',
      additionalStreetInfo: '218 Young Street\n#1246',
    },
    billingAddress: {
      country: 'CA',
      state: 'ON',
      city: 'Toronto',
      firstName: 'Harry',
      lastName: 'Rosen',
      postalCode: 'M5B 2H6',
      phone: '(416) 598-8885',
      additionalStreetInfo: '218 Young Street\n#1246',
    },
    custom: {
      type: {
        key: 'orderCustomFields',
      },
      fields: {
        // loginRadiusUid: '5338a1ad522b47198682616ba6804a29',
        carrierId: 'FDX',
        shippingServiceType: 'EXPEDITED PARCEL',
        shippingIsRush: true,
        totalOrderTax: {
          type: 'centPrecision',
          currencyCode: 'CAD',
          centAmount: 7052,
          fractionDigits: 2,
        },
        shippingCost: {
          type: 'centPrecision',
          currencyCode: 'CAD',
          centAmount: 1000,
          fractionDigits: 2,
        },
        shippingTax: {
          type: 'centPrecision',
          currencyCode: 'CAD',
          centAmount: 130,
          fractionDigits: 2,
        },
        shippingTaxDescription: 'HST-ON',
        returnsAreFree: false,
        signatureIsRequired: false,
        paymentIsReleased: true,
        sentToOmsStatus: 'PENDING',
        transactionTotal: {
          type: 'centPrecision',
          currencyCode: 'CAD',
          centAmount: 54380,
          fractionDigits: 2
        }
      }
    }
  }
  
  const cartWithoutTaxes = (await ctClient.execute({
    method: 'POST',
    uri: requestBuilder.carts.build(),
    body: JSON.stringify(body)   
  })).body

  console.log('Cart created successfully')
  const cartWithTaxes = await addTaxesToCart(cartWithoutTaxes)
  console.log('Taxes added to cart')
  const cartWithPayment = await addPaymentToCart(cartWithTaxes)
  console.log('Payment added to cart')

  return cartWithPayment
}

const generateTestOrderFromCart = async cart => {
  const body = {
    version: cart.version,
    id: cart.id,
    orderNumber: `${Math.floor((Math.random() * 100000000))}`
  }

  return ctClient.execute({
    method: 'POST',
    uri: requestBuilder.orders.build(),
    body: JSON.stringify(body)
  })
}

console.log('Starting to create order...')
generateCompleteTestCart(completeCart => {
  return generateTestOrderFromCart(completeCart)
})
