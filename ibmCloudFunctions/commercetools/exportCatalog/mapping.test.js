const { formatVariant } = require('./mapping')

const product = require('./exampleProduct.json')
const variant = product.variants[0]

describe('formatVariant', () => {
  const params = { dpmRootCategoryId: '8f1b6d78-c29d-46cf-88fe-5bd935e49fd9' }

  describe('English locale', () => {
    it('returns an object with each CSV heading mapped to a value that is in English where applicable when given a variant', () => {
      const locale = 'en-CA'

      expect(formatVariant(locale, product, params)(variant)).toEqual({
        adult: 'no',
        age: 'adult',
        availability: 'out of stock',
        brand: 'Paul & Shark',
        category: 'Clothing,Casual Wear,Polos',
        color: 'Grey',
        condition: 'new',
        currency: 'CAD',
        description:
          'Bold and bright colours are the stars of this Paul & Shark polo. Pop the collar to reveal the large Paul & Shark logo. An everyday casual essential that goes well with white chinos and boat shoes.<table style="width: 100%;"><tr><td style="width:50%; border: 0px !important; text-align: left; vertical-align: top;">PRODUCT DETAILS:<br \\><li> 100% Cotton<br \\><li> Two button placket<br \\><li> Logo buttons<br \\><li> Patch Paul & Shark chest logo<br \\><li> Logo on collar revers<br \\><li> Ribbed knit collar and cuffs<br \\><li> Tonal horizontal stripes<br \\><li> Blue</td><td style="width:50%; border: 0px !important; text-align: left; vertical-align: top;">SIZE & FIT:<br \\><li> Classic Fit<br \\><li> Model is wearing size M</td></tr></table>',
        gtin: null,
        id: '-1485832',
        imageLink: 'https://i1.adis.ws/i/harryrosen/31360102',
        language: 'en',
        link: 'https://harryrosen.com/en/product/31360102',
        parent_sku: '31360102',
        price: '210.00 CAD',
        sale_price: null,
        size: 'S',
        title: 'Striped Pique Polo'
      })
    })
  })

  describe('French locale', () => {
    it('returns an object with each CSV heading mapped to a value that is in French where applicable when given a variant', () => {
      const locale = 'fr-CA'

      expect(formatVariant(locale, product, params)(variant)).toEqual({
        title: 'Polo piqué à rayures',
        id: '-1485832',
        price: '210.00 CAD',
        currency: 'CAD',
        sale_price: null,
        condition: 'new',
        availability: 'out of stock',
        language: 'fr',
        adult: 'no',
        age: 'adult',
        brand: 'Paul & Shark',
        color: 'Gris',
        description:
          'Avec ses couleurs éclatantes et son logo géant à l\'intérieur du col, ce polo Paul & Shark est celui qu\'il vous faut pour les tenues décontractées. Par exemple, vous pouvez l\'agencer à un pantalon en chino blanc et des chaussures bateau.<table style="width: 100%;"><tr><td style="width:50%; border: 0px !important; text-align: left; vertical-align: top;">CARACTÉRISTIQUES :<br \\><li> 100 % coton<br \\><li> Patte à deux boutons<br \\><li> Logo sur les boutons<br \\><li> Écusson Paul & Shark sur la poitrine<br \\><li> Logo sur le revers du col<br \\><li> Poignets et col en tricot côtelé<br \\><li> Rayures horizontales<br \\><li> Bleu</td><td style="width:50%; border: 0px !important; text-align: left; vertical-align: top;">TAILLE ET COUPE :<br \\><li> Coupe classique<br \\><li> Le mannequin porte la taille M</td></tr></table>',
        gtin: null,
        imageLink: 'https://i1.adis.ws/i/harryrosen/31360102',
        parent_sku: '31360102',
        link: 'https://harryrosen.com/fr/produit/31360102',
        category: 'Vêtements,Vêtements décontractés,Polos',
        size: 'P'
      })
    })
  })
})
