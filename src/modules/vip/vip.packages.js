/**
 * VIP Packages Definition
 * 
 * Future improvement: Store these in database for dynamic updating.
 * For MVP, static definition is sufficient.
 */

const VIP_PACKAGES = {
  '7_DAY': {
    id: '7_DAY',
    name: '1 Haftalik VIP',
    durationDays: 7,
    price: 15000, // in so'm
    features: [
      'Top reytingda ko\'rinish',
      'Vazifalarga birinchi bo\'lib taklif berish',
      'Pro nishoni'
    ]
  },
  '30_DAY': {
    id: '30_DAY',
    name: '1 Oylik VIP',
    durationDays: 30,
    price: 50000, // in so'm
    features: [
      'Top reytingda ko\'rinish',
      'Vazifalarga birinchi bo\'lib taklif berish',
      'Pro nishoni',
      'Maxsus yordam'
    ]
  }
};

module.exports = {
  VIP_PACKAGES
};
