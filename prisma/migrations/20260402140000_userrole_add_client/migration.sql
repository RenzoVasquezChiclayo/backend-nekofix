-- Alinear enum con schema Prisma (UserRole.CLIENT). La migración inicial usaba SUPER_ADMIN.
ALTER TYPE "UserRole" ADD VALUE 'CLIENT';
