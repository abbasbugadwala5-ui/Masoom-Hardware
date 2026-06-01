/**
 * Real company details — pulled from the official Masoom Hardware bill book.
 * Single source for header, footer, contact page, invoice & LPO letterhead.
 */
export const COMPANY = {
  legalName: 'Masoom Hardware L.L.C SP',
  tradeName: 'Masoom Hardware',
  trn:       '105426718000003',
  email:     'masoomhw@gmail.com',
  website:   'masoomhardware.ae',

  branches: {
    dubai: {
      label:  'Dubai Branch',
      city:   'Deira, Dubai',
      address:'Nakheel Road, Deira',
      poBox:  'P.O. Box 172463',
      country:'United Arab Emirates',
      tel:    '+971 4 2340 852',
      fax:    '+971 4 2340 952',
      mob:    '+971 50 574 9536',
    },
    sharjah: {
      label:  'Sharjah Branch',
      city:   'Rolla, Sharjah',
      address:'Rolla',
      poBox:  'P.O. Box 350011',
      country:'United Arab Emirates',
      tel:    '+971 6 5634 852',
      fax:    '+971 6 5639 752',
      mob:    '+971 54 583 1001',
      mobAlt: '+971 50 279 5525',
    },
  },
} as const;

export const PRIMARY_PHONE = COMPANY.branches.dubai.tel;
export const WHATSAPP_INTL = COMPANY.branches.dubai.mob.replace(/\D/g, '');
