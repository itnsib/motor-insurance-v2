// lib/users.ts
import { User, UserWithPassword, UserRole } from '@/types/auth';
import { hashPassword } from './auth';

// Default users - only admin
const createDefaultUsers = (): UserWithPassword[] => [
  {
    id: 'user_admin_001',
    email: 'motor@nsib.ae',
    name: 'NSIB Admin',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    passwordHash: hashPassword('admin123'),
  },
];

// In-memory user store (in production, use database)
const users: UserWithPassword[] = createDefaultUsers();

// User management functions
export function getAllUsers(): User[] {
  return users.map(({ passwordHash: _, ...user }) => user);
}

export function getUserById(id: string): User | null {
  const user = users.find(u => u.id === id);
  if (!user) return null;
  const { passwordHash: _, ...userWithoutPassword } = user;
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
  
  const { passwordHash: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

export function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'role' | 'isActive'>>
): User | null {
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  
  const { passwordHash: _, ...userWithoutPassword } = users[index];
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