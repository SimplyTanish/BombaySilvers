import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "./AccessDenied";

type Role = "dealer" | "staff" | "admin" | "super_admin";

interface RequireRoleProps {
  role: Role | Role[];
  children: ReactNode;
}

export function RequireRole({
  role: allowedRoles,
  children,
}: RequireRoleProps) {
  const { role, loading } = useAuth();

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const roles = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  if (!role || !roles.includes(role as Role)) {
  return <AccessDenied />;
}

  return <>{children}</>;
}