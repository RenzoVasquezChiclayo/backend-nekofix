import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: 'admin@nekofix.local' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@nekofix.local',
      password: hash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed OK: admin@nekofix.local (usa SEED_ADMIN_PASSWORD o por defecto Admin123!)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
