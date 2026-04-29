import {
  InventoryMovementType,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_LEADS,
  SEED_MARKER,
  SEED_PHONE_MODELS,
  SEED_PRODUCTS,
  SEED_USERS,
  SeedMovementDef,
  SeedProductDef,
} from './seed-data';

const prisma = new PrismaClient();

function d(val: string): Prisma.Decimal {
  return new Prisma.Decimal(val);
}

function nextStockAfterMovement(
  previousStock: number,
  type: InventoryMovementType,
  quantity: number,
): number {
  switch (type) {
    case InventoryMovementType.IN:
    case InventoryMovementType.RETURN:
      return previousStock + Math.abs(quantity);
    case InventoryMovementType.OUT:
    case InventoryMovementType.SALE:
      return previousStock - Math.abs(quantity);
    case InventoryMovementType.ADJUSTMENT:
      return previousStock + quantity;
    default:
      return previousStock;
  }
}

/** Secuencias de movimiento que terminan en `def.stock` (stock final coherente). */
function buildInventoryMovementDefs(defs: SeedProductDef[]): SeedMovementDef[] {
  const m = SEED_MARKER;
  const out: SeedMovementDef[] = [];

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const fs = def.stock;

    if (i % 4 === 0) {
      out.push(
        {
          productSlug: def.slug,
          type: InventoryMovementType.IN,
          quantity: fs + 25,
          notes: `${m} Ingreso inicial proveedor.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.SALE,
          quantity: 15,
          notes: `${m} Venta retail.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.RETURN,
          quantity: 5,
          notes: `${m} Devolución cliente.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.OUT,
          quantity: 5,
          notes: `${m} Transferencia entre tiendas.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.ADJUSTMENT,
          quantity: -10,
          notes: `${m} Ajuste inventario físico.`,
        },
      );
    } else if (i % 4 === 1) {
      out.push(
        {
          productSlug: def.slug,
          type: InventoryMovementType.IN,
          quantity: fs + 20,
          notes: `${m} Compra a distribuidor.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.SALE,
          quantity: 20,
          notes: `${m} Venta canal online.`,
        },
      );
    } else if (i % 4 === 2) {
      out.push(
        {
          productSlug: def.slug,
          type: InventoryMovementType.IN,
          quantity: fs + 30,
          notes: `${m} Ingreso mayorista.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.SALE,
          quantity: 10,
          notes: `${m} Venta feria / evento.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.OUT,
          quantity: 5,
          notes: `${m} Unidad muestra tienda.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.ADJUSTMENT,
          quantity: -15,
          notes: `${m} Corrección conteo.`,
        },
      );
    } else {
      out.push(
        {
          productSlug: def.slug,
          type: InventoryMovementType.IN,
          quantity: fs + 35,
          notes: `${m} Stock de apertura.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.RETURN,
          quantity: 3,
          notes: `${m} Devolución garantía.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.SALE,
          quantity: 8,
          notes: `${m} Venta B2B.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.OUT,
          quantity: 10,
          notes: `${m} Salida consignación.`,
        },
        {
          productSlug: def.slug,
          type: InventoryMovementType.ADJUSTMENT,
          quantity: -20,
          notes: `${m} Auditoría de stock.`,
        },
      );
    }
  }

  return out;
}

function productPayload(
  def: SeedProductDef,
  brandId: string,
  categoryId: string,
  modelId: string | null,
): Prisma.ProductCreateInput {
  return {
    name: def.name,
    slug: def.slug,
    sku: def.sku,
    description: def.description,
    price: d(def.price),
    comparePrice: def.comparePrice ? d(def.comparePrice) : null,
    type: def.type,
    condition: def.condition,
    stock: def.stock,
    minStock: def.minStock,
    storage: def.storage ?? null,
    color: def.color ?? null,
    batteryHealth: def.batteryHealth ?? null,
    grade: def.grade ?? null,
    isFeatured: def.isFeatured,
    isPublished: true,
    seoTitle: def.seoTitle,
    seoDescription: def.seoDescription,
    brand: { connect: { id: brandId } },
    category: { connect: { id: categoryId } },
    ...(modelId ? { model: { connect: { id: modelId } } } : {}),
  };
}

function placeholdImageUrl(productName: string, variantIndex: number): string {
  const text = `NekoFix | ${productName} | ${variantIndex + 1}`;
  return `https://placehold.co/600x600/png?text=${encodeURIComponent(text)}`;
}

async function seedUsers() {
  for (const u of SEED_USERS) {
    const raw = process.env[u.envPassword] ?? u.defaultPassword;
    const hash = await bcrypt.hash(raw, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: hash,
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        password: hash,
        role: u.role,
        isActive: true,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log('Seed users OK');
}

async function seedSuperAdmin() {
  const emailRaw = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!emailRaw) {
    // eslint-disable-next-line no-console
    console.log(
      'Seed super admin: omitido (defina SUPER_ADMIN_EMAIL en .env para crear o promover al super administrador)',
    );
    return;
  }

  const passwordRaw =
    process.env.SUPER_ADMIN_PASSWORD?.trim() || 'SuperAdmin123!';
  const hash = await bcrypt.hash(passwordRaw, 10);

  await prisma.user.upsert({
    where: { email: emailRaw },
    update: {
      role: UserRole.SUPER_ADMIN,
      password: hash,
      isActive: true,
      name: 'Super administrador',
    },
    create: {
      email: emailRaw,
      name: 'Super administrador',
      password: hash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  // eslint-disable-next-line no-console
  console.log('Seed super admin OK:', emailRaw);
}

async function seedBrands(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    SEED_BRANDS.map(async (b) => {
      const row = await prisma.brand.upsert({
        where: { slug: b.slug },
        update: { name: b.name, logo: b.logo },
        create: { name: b.name, slug: b.slug, logo: b.logo },
      });
      map.set(b.slug, row.id);
    }),
  );
  // eslint-disable-next-line no-console
  console.log('Seed brands OK');
  return map;
}

async function seedCategories(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    SEED_CATEGORIES.map(async (c) => {
      const row = await prisma.category.upsert({
        where: { slug: c.slug },
        update: { name: c.name, icon: c.icon },
        create: { name: c.name, slug: c.slug, icon: c.icon },
      });
      map.set(c.slug, row.id);
    }),
  );
  // eslint-disable-next-line no-console
  console.log('Seed categories OK');
  return map;
}

async function seedPhoneModels(
  brandBySlug: Map<string, string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    SEED_PHONE_MODELS.map(async (m) => {
      const brandId = brandBySlug.get(m.brandSlug);
      if (!brandId) {
        throw new Error(`Marca no encontrada: ${m.brandSlug}`);
      }
      const row = await prisma.phoneModel.upsert({
        where: { slug: m.slug },
        update: { name: m.name, brandId },
        create: { name: m.name, slug: m.slug, brandId },
      });
      map.set(m.slug, row.id);
    }),
  );
  // eslint-disable-next-line no-console
  console.log('Seed phone models OK');
  return map;
}

async function seedProducts(
  brandBySlug: Map<string, string>,
  categoryBySlug: Map<string, string>,
  modelBySlug: Map<string, string>,
): Promise<Map<string, { id: string }>> {
  const productBySlug = new Map<string, { id: string }>();

  for (const def of SEED_PRODUCTS) {
    const brandId = brandBySlug.get(def.brandSlug);
    const categoryId = categoryBySlug.get(def.categorySlug);
    if (!brandId || !categoryId) {
      throw new Error(
        `Relación inválida para producto ${def.slug}: brand o category`,
      );
    }
    const modelId = def.modelSlug
      ? (modelBySlug.get(def.modelSlug) ?? null)
      : null;
    if (def.modelSlug && !modelId) {
      throw new Error(`Modelo no encontrado: ${def.modelSlug}`);
    }

    const data = productPayload(def, brandId, categoryId, modelId);

    const row = await prisma.product.upsert({
      where: { slug: def.slug },
      update: {
        ...data,
        slug: def.slug,
        sku: def.sku,
      },
      create: {
        ...data,
      },
    });
    productBySlug.set(def.slug, { id: row.id });
  }

  // eslint-disable-next-line no-console
  console.log('Seed products OK');
  return productBySlug;
}

async function seedProductImages(productBySlug: Map<string, { id: string }>) {
  const seedIds = [...productBySlug.values()].map((p) => p.id);
  await prisma.productImage.deleteMany({
    where: { productId: { in: seedIds } },
  });

  for (const def of SEED_PRODUCTS) {
    const product = productBySlug.get(def.slug);
    if (!product) continue;
    const count = def.imageCount;
    const rows = Array.from({ length: count }, (_, i) => ({
      productId: product.id,
      url: placeholdImageUrl(def.name, i),
      alt: `${def.name} — vista ${i + 1} (demo NekoFix)`,
      sortOrder: i,
      isPrimary: i === 0,
    }));
    await prisma.productImage.createMany({ data: rows });
  }
  // eslint-disable-next-line no-console
  console.log('Seed product images OK');
}

async function seedInventoryMovements(
  adminId: string,
  productBySlug: Map<string, { id: string }>,
) {
  await prisma.inventoryMovement.deleteMany({
    where: { notes: { contains: SEED_MARKER } },
  });

  const movements = buildInventoryMovementDefs(SEED_PRODUCTS);
  const running = new Map<string, number>();
  const baseTime = Date.now() - 45 * 24 * 60 * 60 * 1000;
  let seq = 0;

  for (const mv of movements) {
    const product = productBySlug.get(mv.productSlug);
    if (!product) {
      throw new Error(`Producto no encontrado para movimiento: ${mv.productSlug}`);
    }
    const previousStock = running.get(mv.productSlug) ?? 0;
    const newStock = nextStockAfterMovement(
      previousStock,
      mv.type,
      mv.quantity,
    );
    running.set(mv.productSlug, newStock);

    const createdAt = new Date(baseTime + seq * 90_000);
    seq += 1;

    const qtyStored =
      mv.type === InventoryMovementType.ADJUSTMENT
        ? mv.quantity
        : Math.abs(mv.quantity);

    await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        type: mv.type,
        quantity: qtyStored,
        previousStock,
        newStock,
        notes: mv.notes,
        createdById: adminId,
        createdAt,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed inventory OK');
}

function leadCreatedAt(daysAgo: number, hoursOffset = 0): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(dt.getHours() - hoursOffset);
  return dt;
}

async function seedLeads(productBySlug: Map<string, { id: string }>) {
  for (const lead of SEED_LEADS) {
    const lines: Array<Record<string, unknown>> = [];
    let total = new Prisma.Decimal(0);

    for (const item of lead.items) {
      const p = productBySlug.get(item.slug);
      if (!p) {
        throw new Error(`Lead: producto no encontrado ${item.slug}`);
      }
      const def = SEED_PRODUCTS.find((x) => x.slug === item.slug);
      const unit = d(item.unitPrice);
      const lineTotal = unit.mul(item.qty);
      total = total.add(lineTotal);
      lines.push({
        productId: p.id,
        sku: def?.sku ?? item.slug,
        nombre: def?.name ?? item.slug,
        name: def?.name ?? item.slug,
        quantity: item.qty,
        qty: item.qty,
        price: item.unitPrice,
        precio: item.unitPrice,
        lineTotal: lineTotal.toFixed(2),
      });
    }

    const createdAt = leadCreatedAt(lead.daysAgo, lead.hoursOffset ?? 0);

    await prisma.lead.upsert({
      where: { id: lead.id },
      update: {
        products: lines as Prisma.InputJsonValue,
        total,
        phone: lead.phone,
        createdAt,
      },
      create: {
        id: lead.id,
        products: lines as Prisma.InputJsonValue,
        total,
        phone: lead.phone,
        createdAt,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log('Seed leads OK');
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('--- NekoFix seed (demo) ---');

  await seedUsers();
  await seedSuperAdmin();

  // const [brandBySlug, categoryBySlug] = await Promise.all([
  //   seedBrands(),
  //   seedCategories(),
  // ]);

  // const modelBySlug = await seedPhoneModels(brandBySlug);
  // const productBySlug = await seedProducts(
  //   brandBySlug,
  //   categoryBySlug,
  //   modelBySlug,
  // );

  // await seedProductImages(productBySlug);

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: 'admin@nekofix.local' },
    select: { id: true },
  });

  // await seedInventoryMovements(admin.id, productBySlug);
  // await seedLeads(productBySlug);

  // eslint-disable-next-line no-console
  console.log('--- Seed completado ---');
  // eslint-disable-next-line no-console
  console.log(
    `Admin: admin@nekofix.local (SEED_ADMIN_PASSWORD o ${SEED_USERS[0].defaultPassword})`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `Cliente demo: cliente@nekofix.local (SEED_CLIENT_PASSWORD o Cliente123!)`,
  );
  // eslint-disable-next-line no-console
  console.log(
    'Super admin: definir SUPER_ADMIN_EMAIL (+ SUPER_ADMIN_PASSWORD) y ejecutar seed para crear/promover.',
  );
  // eslint-disable-next-line no-console
  // console.log(
  //   `Productos: ${SEED_PRODUCTS.length} | Movimientos seed: ${buildInventoryMovementDefs(SEED_PRODUCTS).length} | Leads: ${SEED_LEADS.length}`,
  // );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
