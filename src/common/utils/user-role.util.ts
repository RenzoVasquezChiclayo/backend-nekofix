import { UserRole } from '@prisma/client';

/** Acceso al panel (login JWT) y rutas marcadas como @Roles(ADMIN). */
export function hasStaffPanelAccess(role?: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

/** Catálogo admin: ver borradores, rutas que hoy comparan con ADMIN. */
export function hasStaffCatalogAccess(role?: UserRole): boolean {
  return hasStaffPanelAccess(role);
}

export function isSuperAdmin(role?: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}
