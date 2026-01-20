// types/auth.ts

export type UserRole = 'advisor' | 'hod' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// Role permissions
export const ROLE_PERMISSIONS = {
  advisor: {
    canCreateQuotes: true,
    canEditOwnQuotes: true,
    canDeleteOwnQuotes: true,
    canViewOwnHistory: true,
    canViewAllHistory: false,
    canManageUsers: false,
    canApproveChanges: false,
    canViewAllFiles: false,
  },
  hod: {
    canCreateQuotes: true,
    canEditOwnQuotes: true,
    canDeleteOwnQuotes: true,
    canViewOwnHistory: true,
    canViewAllHistory: true,
    canManageUsers: false,
    canApproveChanges: true,
    canViewAllFiles: true,
  },
  admin: {
    canCreateQuotes: true,
    canEditOwnQuotes: true,
    canDeleteOwnQuotes: true,
    canViewOwnHistory: true,
    canViewAllHistory: true,
    canManageUsers: true,
    canApproveChanges: true,
    canViewAllFiles: true,
  },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.admin;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
