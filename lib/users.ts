// lib/users.ts

import { User, UserWithPassword, UserRole } from '@/types/auth';
import { hashPassword } from './auth';

// Default users - In production, this would be in a database
// Passwords: admin123, hod123, advisor123
const DEFAULT_USERS: UserWithPassword[] = [
  {
    id: 'user_admin_001',
    email: 'admin@nsib.ae',
    name: 'System Administrator',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    passwordHash: hashPassword('admin123'),
  },
  {
    id: 'user_hod_001',
    email: 'hod@nsib.ae',
    name: 'Head of Department',
    role: 'hod',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    passwordHash: hashPassword('hod123'),
  },
  {
    id: 'user_advisor_001',
    email: 'advisor@nsib.ae',
    name: 'Insurance Advisor',
    role: 'advisor',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    passwordHash: hashPassword('advisor123'),
  },
  {
    id: 'user_advisor_002',
    email: 'ahmed@nsib.ae',
    name: 'Ahmed Hassan',
    role: 'advisor',
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
    passwordHash: hashPassword('ahmed123'),
  },
  {
    id: 'user_advisor_003',
    email: 'sarah@nsib.ae',
    name: 'Sarah Khan',
    role: 'advisor',
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    passwordHash: hashPassword('sarah123'),
  },
];

// In-memory user store (in production, use database)
let users: UserWithPassword[] = [...DEFAULT_USERS];

// User management functions
export function getAllUsers(): User[] {
  return users.map(({ passwordHash, ...user }) => user);
}

export function getUserById(id: string): User | null {
  const user = users.find(u => u.id === id);
  if (!user) return null;
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function getUserByEmail(email: string): UserWithPassword | null {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function createUser(
  email: string,
  name: string,
  password: string,
  role: UserRole
): User {
  const newUser: UserWithPassword = {
    id: `user_${Date.now()}`,
    email: email.toLowerCase(),
    name,
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
  };
  
  users.push(newUser);
  
  const { passwordHash, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

export function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'role' | 'isActive'>>
): User | null {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  
  const { passwordHash, ...userWithoutPassword } = users[index];
  return userWithoutPassword;
}

export function updateUserPassword(id: string, newPassword: string): boolean {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;
  
  users[index].passwordHash = hashPassword(newPassword);
  return true;
}

export function updateLastLogin(id: string): void {
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index].lastLogin = new Date().toISOString();
  }
}

export function deleteUser(id: string): boolean {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;
  
  // Don't allow deleting the last admin
  const user = users[index];
  if (user.role === 'admin') {
    const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
    if (adminCount <= 1) return false;
  }
  
  users.splice(index, 1);
  return true;
}

// For Vercel Blob storage - persist users
export async function loadUsersFromStorage(): Promise<void> {
  try {
    const response = await fetch('/api/users-data');
    if (response.ok) {
      const data = await response.json();
      if (data.users && data.users.length > 0) {
        users = data.users;
      }
    }
  } catch (error) {
    console.error('Error loading users from storage:', error);
  }
}

export async function saveUsersToStorage(): Promise<void> {
  try {
    await fetch('/api/users-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    });
  } catch (error) {
    console.error('Error saving users to storage:', error);
  }
}
