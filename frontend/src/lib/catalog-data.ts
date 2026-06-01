/**
 * Static catalog content for the public marketing site.
 * When Phase 2 lands and the backend exposes /api/products, swap these arrays
 * for fetch() calls — UI shapes are already aligned with the Prisma models.
 */

export interface BrandData {
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
}

export interface CategoryData {
  slug: string;
  name: string;
  description: string;
  icon: 'hand' | 'power' | 'measure' | 'storage' | 'industrial' | 'safety' | 'paint' | 'fasteners';
  itemsApprox: number;
}

export interface ProductData {
  sku: string;
  name: string;
  brandSlug: string;
  categorySlug: string;
  unit: string;
  highlight?: string;
}

export const BRANDS: BrandData[] = [
  { slug: 'stanley',       name: 'Stanley',        tagline: 'Built to last since 1843', blurb: 'Hand tools, tape measures, storage — the contractor classic.' },
  { slug: 'bosch',         name: 'Bosch',          tagline: 'Invented for life',         blurb: 'Professional Blue power tools, measuring instruments, accessories.' },
  { slug: 'makita',        name: 'Makita',         tagline: 'The leader in cordless',    blurb: '18V/40V LXT platforms — drills, grinders, saws, outdoor equipment.' },
  { slug: 'dewalt',        name: 'DeWalt',         tagline: 'Guaranteed tough',          blurb: 'Heavy-duty corded and cordless tools for jobsite professionals.' },
  { slug: 'victor',        name: 'Victor',         tagline: 'Welding & cutting',         blurb: 'Gas welding, cutting torches, regulators — industrial fabrication.' },
  { slug: 'rasta',         name: 'Rasta',          tagline: 'Quality hand tools',        blurb: 'Reliable hand tools and accessories for daily site use.' },
  { slug: 'success-tapes', name: 'Success Tapes',  tagline: 'Measure with confidence',   blurb: 'Wide-blade and pocket measuring tapes — long-life nylon coated.' },
];

export const CATEGORIES: CategoryData[] = [
  { slug: 'hand-tools',          name: 'Hand Tools',          description: 'Hammers, pliers, screwdrivers, wrenches, chisels.',    icon: 'hand',       itemsApprox: 1240 },
  { slug: 'power-tools',         name: 'Power Tools',         description: 'Drills, grinders, saws, rotary hammers — corded & cordless.', icon: 'power', itemsApprox: 980 },
  { slug: 'measuring-tools',     name: 'Measuring Tools',     description: 'Tape measures, laser levels, calipers, squares.',     icon: 'measure',    itemsApprox: 420 },
  { slug: 'storage',             name: 'Storage & Workshop',  description: 'Tool boxes, cabinets, organisers, mobile workstations.', icon: 'storage',  itemsApprox: 310 },
  { slug: 'industrial-equipment',name: 'Industrial Equipment',description: 'Welding, cutting, generators, compressors, pumps.',    icon: 'industrial', itemsApprox: 560 },
  { slug: 'safety',              name: 'Safety & PPE',        description: 'Helmets, gloves, glasses, harnesses, footwear.',      icon: 'safety',     itemsApprox: 380 },
  { slug: 'paint-finishing',     name: 'Paint & Finishing',   description: 'Brushes, rollers, sprayers, abrasives, masking.',     icon: 'paint',      itemsApprox: 290 },
  { slug: 'fasteners',           name: 'Fasteners & Fixings', description: 'Anchors, screws, bolts, nails — bulk and packaged.',  icon: 'fasteners',  itemsApprox: 1850 },
];

export const FEATURED_PRODUCTS: ProductData[] = [
  { sku: 'STA-FMC647', name: 'Stanley FATMAX 8m Tape Measure',         brandSlug: 'stanley',       categorySlug: 'measuring-tools',      unit: 'PCS', highlight: 'Best seller' },
  { sku: 'BSH-GSB13RE',name: 'Bosch GSB 13 RE Impact Drill 600W',      brandSlug: 'bosch',         categorySlug: 'power-tools',          unit: 'PCS' },
  { sku: 'MKT-DHP484', name: 'Makita DHP484 18V LXT Brushless Drill',  brandSlug: 'makita',        categorySlug: 'power-tools',          unit: 'PCS', highlight: 'New' },
  { sku: 'DWT-DCD791', name: 'DeWalt DCD791 20V Cordless Drill',       brandSlug: 'dewalt',        categorySlug: 'power-tools',          unit: 'PCS' },
  { sku: 'STA-89-852', name: 'Stanley 22-piece Socket Set',            brandSlug: 'stanley',       categorySlug: 'hand-tools',           unit: 'SET' },
  { sku: 'BSH-GWS900', name: 'Bosch GWS 900-125 Angle Grinder',        brandSlug: 'bosch',         categorySlug: 'power-tools',          unit: 'PCS' },
  { sku: 'VIC-CA2460', name: 'Victor CA2460 Heavy-Duty Cutting Torch', brandSlug: 'victor',        categorySlug: 'industrial-equipment', unit: 'PCS' },
  { sku: 'RST-HMR16',  name: 'Rasta 16 oz Claw Hammer Fiberglass',     brandSlug: 'rasta',         categorySlug: 'hand-tools',           unit: 'PCS' },
  { sku: 'SCS-TPE5M',  name: 'Success 5m Pocket Measuring Tape',       brandSlug: 'success-tapes', categorySlug: 'measuring-tools',      unit: 'PCS' },
  { sku: 'MKT-TB144',  name: 'Makita Heavy-Duty Tool Box 19"',         brandSlug: 'makita',        categorySlug: 'storage',              unit: 'PCS' },
  { sku: 'DWT-DCS391', name: 'DeWalt DCS391 20V Circular Saw',         brandSlug: 'dewalt',        categorySlug: 'power-tools',          unit: 'PCS' },
  { sku: 'STA-1-77-026',name:'Stanley Laser Level Cross-Line',         brandSlug: 'stanley',       categorySlug: 'measuring-tools',      unit: 'PCS' },
];

export const ALL_PRODUCTS: ProductData[] = [
  ...FEATURED_PRODUCTS,
  { sku: 'STA-MTRBOX',  name: 'Stanley Mitre Box Plastic',           brandSlug: 'stanley',  categorySlug: 'hand-tools',      unit: 'PCS' },
  { sku: 'BSH-PSB18',   name: 'Bosch PSB 18 LI-2 Cordless Drill',    brandSlug: 'bosch',    categorySlug: 'power-tools',     unit: 'PCS' },
  { sku: 'MKT-HM1203C', name: 'Makita HM1203C Demolition Hammer',    brandSlug: 'makita',   categorySlug: 'power-tools',     unit: 'PCS' },
  { sku: 'DWT-DWE490',  name: 'DeWalt DWE490 Large Angle Grinder 9"',brandSlug: 'dewalt',   categorySlug: 'power-tools',     unit: 'PCS' },
  { sku: 'VIC-REG250',  name: 'Victor Single-Stage Regulator',       brandSlug: 'victor',   categorySlug: 'industrial-equipment', unit: 'PCS' },
  { sku: 'STA-94-248',  name: 'Stanley 65-piece Screwdriver Bit Set',brandSlug: 'stanley',  categorySlug: 'hand-tools',      unit: 'SET' },
  { sku: 'SCS-TPE8M',   name: 'Success 8m Long-Blade Tape',          brandSlug: 'success-tapes', categorySlug: 'measuring-tools', unit: 'PCS' },
  { sku: 'GEN-PPE-HMT', name: 'Industrial Safety Helmet (Yellow)',   brandSlug: 'stanley',  categorySlug: 'safety',          unit: 'PCS' },
  { sku: 'GEN-PPE-GLV', name: 'Cut-Resistant Work Gloves Lvl 5',     brandSlug: 'stanley',  categorySlug: 'safety',          unit: 'PR'  },
  { sku: 'GEN-PNT-ROL', name: '9" Paint Roller + Tray Set',          brandSlug: 'rasta',    categorySlug: 'paint-finishing', unit: 'SET' },
  { sku: 'GEN-FSN-ANC', name: 'Wedge Anchor M10 × 100mm (box of 50)',brandSlug: 'rasta',    categorySlug: 'fasteners',       unit: 'BOX' },
  { sku: 'GEN-FSN-SCW', name: 'Self-Tapping Screws 4×35mm (box 500)',brandSlug: 'rasta',    categorySlug: 'fasteners',       unit: 'BOX' },
];

export const findBrand    = (slug: string) => BRANDS.find((b) => b.slug === slug);
export const findCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
