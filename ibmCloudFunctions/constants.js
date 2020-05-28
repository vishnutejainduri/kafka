module.exports = {
  // The three accepted activity types from jesta
  // Both A and C are treated as the same, can be either create or update
  // Type D is always a deletion
  priceActivityTypes: {
    APPROVED: 'A',
    CREATED: 'C',
    DELETED: 'D'
  }
}
