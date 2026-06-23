export type ProductMediaPolicyTarget = "RESTAURANT_HERO" | "RESTAURANT_LOGO" | "DROP_PRIMARY";

export function canRoleManageProductMedia(roleCode: string | null, targetCode: ProductMediaPolicyTarget): boolean {
  if (!roleCode) return false;
  const allowedRoles = targetCode === "DROP_PRIMARY" ? ["OWNER", "ADMIN", "OPERATIONS"] : ["OWNER", "ADMIN"];
  return allowedRoles.includes(roleCode);
}
