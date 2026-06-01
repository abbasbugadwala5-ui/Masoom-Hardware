/**
 * Company letterhead details for generated PDFs.
 * Mirrors frontend/src/lib/company.ts — single source for invoice/LPO header & footer.
 * Legal name + TRN can be overridden at runtime from CompanySettings (see getCompany()).
 */
import { prisma } from '../../db/prisma';

export const COMPANY = {
  legalName: 'Masoom Hardware L.L.C SP',
  tradeName: 'Masoom Hardware',
  trn: '105426718000003',
  email: 'masoomhw@gmail.com',
  website: 'masoomhardware.ae',
  branches: {
    dubai: {
      label: 'Dubai Branch',
      address: 'Nakheel Road, Deira, Dubai',
      poBox: 'P.O. Box 172463',
      tel: '+971 4 2340 852',
      mob: '+971 50 574 9536',
    },
    sharjah: {
      label: 'Sharjah Branch',
      address: 'Rolla, Sharjah',
      poBox: 'P.O. Box 350011',
      tel: '+971 6 5634 852',
      mob: '+971 54 583 1001',
    },
  },
} as const;

export type CompanyInfo = typeof COMPANY & { legalName: string; trn: string };

/** Overlay the persisted CompanySettings (legalName/trn/email/phone) onto the static constants. */
export async function getCompany(): Promise<CompanyInfo> {
  const s = await prisma.companySettings.findFirst();
  if (!s) return COMPANY;
  return {
    ...COMPANY,
    legalName: s.legalName || COMPANY.legalName,
    tradeName: s.tradeName || COMPANY.tradeName,
    trn: s.trn || COMPANY.trn,
    email: s.email || COMPANY.email,
  } as CompanyInfo;
}
