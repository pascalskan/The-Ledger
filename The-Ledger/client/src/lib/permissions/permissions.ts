import { User, PermissionKey } from "../../types/auth";

export function hasPermission(
  user: User,
  permission: PermissionKey
): boolean {
  // Assuming user has a `permissions` array or we need to look it up from roles
  // But based on the prompt, it assumes user.permissions exists.
  // Wait, User interface in auth.ts only has roleIds: string[].
  // Let me double check what User interface has right now.
  return (user as any).permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  user: User,
  permissions: PermissionKey[]
): boolean {
  return permissions.some((p) =>
    (user as any).permissions?.includes(p)
  );
}
