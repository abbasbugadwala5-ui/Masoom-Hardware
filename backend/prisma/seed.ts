/* eslint-disable no-console */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

/**
 * Permission keys are dot-namespaced: `<entity>.<action>`.
 * Add new ones here when you add modules — the seed is idempotent.
 */
const PERMISSIONS: { key: string; description: string }[] = [
  // users / roles
  { key: 'user.read',     description: 'View users' },
  { key: 'user.create',   description: 'Create users' },
  { key: 'user.update',   description: 'Update users' },
  { key: 'user.delete',   description: 'Delete users' },
  { key: 'role.manage',   description: 'Manage roles & permissions' },

  // catalog
  { key: 'product.read',  description: 'View products' },
  { key: 'product.write', description: 'Create / edit products' },
  { key: 'product.delete',description: 'Delete products' },

  // partners
  { key: 'customer.read',  description: 'View customers' },
  { key: 'customer.write', description: 'Create / edit customers' },
  { key: 'supplier.read',  description: 'View suppliers' },
  { key: 'supplier.write', description: 'Create / edit suppliers' },

  // inventory
  { key: 'inventory.read',     description: 'View stock' },
  { key: 'inventory.transfer', description: 'Transfer stock between warehouses' },
  { key: 'inventory.adjust',   description: 'Adjust / write off stock' },

  // sales
  { key: 'quotation.read',  description: 'View quotations' },
  { key: 'quotation.write', description: 'Create / edit quotations' },
  { key: 'salesorder.read', description: 'View sales orders' },
  { key: 'salesorder.write',description: 'Create / edit sales orders' },
  { key: 'invoice.read',    description: 'View invoices' },
  { key: 'invoice.create',  description: 'Create invoices' },
  { key: 'invoice.post',    description: 'Post / finalise invoices' },
  { key: 'delivery.read',   description: 'View delivery orders' },
  { key: 'delivery.write',  description: 'Create / dispatch delivery orders' },
  { key: 'delivery.create', description: 'Create delivery orders (legacy alias)' },
  { key: 'creditnote.read', description: 'View credit notes' },
  { key: 'creditnote.write',description: 'Create credit notes' },
  { key: 'payment.read',    description: 'View payments / receipts' },
  { key: 'payment.receive', description: 'Receive customer payments' },

  // purchases
  { key: 'lpo.read',           description: 'View LPOs' },
  { key: 'lpo.write',          description: 'Create / edit LPOs' },
  { key: 'grn.read',           description: 'View goods-received notes' },
  { key: 'grn.write',          description: 'Record goods received' },
  { key: 'purchaseinvoice.read',  description: 'View purchase invoices' },
  { key: 'purchaseinvoice.write', description: 'Record purchase invoices' },
  { key: 'debitnote.read',     description: 'View debit notes' },
  { key: 'debitnote.write',    description: 'Create debit notes' },
  { key: 'payment.pay',        description: 'Pay suppliers' },

  // accounts / reports
  { key: 'accounts.read',  description: 'View accounts data' },
  { key: 'accounts.write', description: 'Create journals / expenses' },
  { key: 'reports.read',   description: 'View reports' },

  // company settings
  { key: 'settings.manage', description: 'Edit company / VAT settings' },
];

const ROLES: { name: string; description: string; permissionKeys: '*' | string[] }[] = [
  {
    name: 'SUPER_ADMIN',
    description: 'Unrestricted access',
    permissionKeys: '*',
  },
  {
    name: 'ADMIN',
    description: 'Operational admin (no user/role management)',
    permissionKeys: [
      'user.read',
      'product.read', 'product.write', 'product.delete',
      'customer.read', 'customer.write',
      'supplier.read', 'supplier.write',
      'inventory.read', 'inventory.transfer', 'inventory.adjust',
      'quotation.read', 'quotation.write',
      'salesorder.read', 'salesorder.write',
      'invoice.read', 'invoice.create', 'invoice.post',
      'delivery.read', 'delivery.write', 'delivery.create',
      'creditnote.read', 'creditnote.write',
      'payment.read', 'payment.receive',
      'lpo.read', 'lpo.write', 'grn.read', 'grn.write',
      'purchaseinvoice.read', 'purchaseinvoice.write',
      'debitnote.read', 'debitnote.write', 'payment.pay',
      'accounts.read', 'accounts.write',
      'reports.read',
      'settings.manage',
    ],
  },
  {
    name: 'ACCOUNTANT',
    description: 'Finance + invoicing + reports',
    permissionKeys: [
      'customer.read', 'supplier.read',
      'salesorder.read',
      'invoice.read', 'invoice.create', 'invoice.post',
      'creditnote.read', 'creditnote.write',
      'payment.read', 'payment.receive',
      'lpo.read', 'grn.read',
      'purchaseinvoice.read', 'purchaseinvoice.write',
      'debitnote.read', 'debitnote.write', 'payment.pay',
      'accounts.read', 'accounts.write',
      'reports.read',
    ],
  },
  {
    name: 'SALESMAN',
    description: 'Quotations, sales orders, delivery orders',
    permissionKeys: [
      'product.read',
      'customer.read', 'customer.write',
      'inventory.read',
      'quotation.read', 'quotation.write',
      'salesorder.read', 'salesorder.write',
      'invoice.read',
      'delivery.read', 'delivery.write', 'delivery.create',
      'reports.read',
    ],
  },
  {
    name: 'WAREHOUSE',
    description: 'Stock movement, deliveries, GRN',
    permissionKeys: [
      'product.read',
      'inventory.read', 'inventory.transfer', 'inventory.adjust',
      'delivery.read', 'delivery.write', 'delivery.create',
      'lpo.read', 'grn.read', 'grn.write',
    ],
  },
  {
    name: 'CUSTOMER',
    description: 'Customer portal (view own invoices)',
    permissionKeys: [
      'invoice.read',
    ],
  },
];

async function main() {
  console.log('▶ Seeding permissions…');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: p,
      update: { description: p.description },
    });
  }

  console.log('▶ Seeding roles…');
  const allPermissions = await prisma.permission.findMany();
  const byKey = new Map(allPermissions.map((p) => [p.key, p.id]));

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      create: { name: r.name, description: r.description, isSystem: true },
      update: { description: r.description, isSystem: true },
    });

    const wantedKeys = r.permissionKeys === '*' ? PERMISSIONS.map((p) => p.key) : r.permissionKeys;
    const wantedIds = wantedKeys.map((k) => byKey.get(k)).filter((x): x is string => !!x);

    // Reset to exact set
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: wantedIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }

  console.log('▶ Seeding super-admin user…');
  const superRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } });
  const hash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL },
    create: {
      email: env.SEED_ADMIN_EMAIL,
      passwordHash: hash,
      fullName: 'Masoom Super Admin',
      roleId: superRole.id,
    },
    update: { roleId: superRole.id, isActive: true },
  });

  console.log('▶ Seeding warehouses…');
  for (const w of [
    { code: 'DXB-01', name: 'Deira (Nakheel Rd) — Dubai', city: 'Deira, Dubai',  address: 'Nakheel Road, P.O. Box 172463' },
    { code: 'SHJ-01', name: 'Rolla — Sharjah',            city: 'Rolla, Sharjah', address: 'Rolla, P.O. Box 350011' },
  ]) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      create: w,
      update: { name: w.name, city: w.city, address: w.address },
    });
  }

  console.log('▶ Seeding company settings…');
  const COMPANY_DATA = {
    legalName:    'Masoom Hardware L.L.C SP',
    tradeName:    'Masoom Hardware',
    trn:          '105426718000003',
    email:        'masoomhw@gmail.com',
    phone:        '+971 4 2340 852',
    addressLine1: 'Nakheel Road',
    addressLine2: 'P.O. Box 172463',
    city:         'Deira, Dubai',
    country:      'United Arab Emirates',
  };
  const existing = await prisma.companySettings.findFirst();
  if (existing) {
    await prisma.companySettings.update({ where: { id: existing.id }, data: COMPANY_DATA });
  } else {
    await prisma.companySettings.create({ data: COMPANY_DATA });
  }

  console.log('▶ Seeding document sequences…');
  const year = Number(String(new Date().getFullYear()).slice(-2));
  for (const prefix of ['QT', 'SO', 'INV', 'DO', 'LPO', 'CN', 'DN', 'RV', 'PV', 'GRN', 'ST', 'EXP', 'JV']) {
    await prisma.documentSequence.upsert({
      where: { prefix_year: { prefix, year } },
      create: { prefix, year, lastNum: 0 },
      update: {},
    });
  }

  console.log('✔ Seed complete.');
  console.log(`  Login: ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
