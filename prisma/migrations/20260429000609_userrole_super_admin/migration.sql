-- Añade SUPER_ADMIN al enum solo si no existe (bases creadas con la migración
-- inicial ya incluían SUPER_ADMIN; otras solo ADMIN + CLIENT).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'SUPER_ADMIN'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
  END IF;
END
$$;

-- Promoción por email: usar variable de entorno en `prisma db seed`
-- (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD), no en SQL estático.
