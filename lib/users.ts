// lib/users.ts
import { User, UserWithPassword, UserRole } from '@/types/auth';
import { hashPassword } from './auth';
import { put, list } from '@vercel/blob';

const USERS_BLOB_KEY = 'nsib-users-data.json';

// Default users - created on first run
const createDefaultUsers = (): UserWithPassword[] => [
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

// In-memory cache
let usersCache: UserWithPassword[] | null = null;
let cacheInitialized = false;

// Load users from Vercel Blob
async function loadUsersFromBlob(): Promise<UserWithPassword[]> {
  try {
    const { blobs } = await list({ prefix: USERS_BLOB_KEY });
    
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      if (response.ok) {
        const data = await response.json();
        console.log('Users loaded from Blob storage:', data.length);
        return data;
      }
    }
    
    // No existing users, create defaults and save
    console.log('No users in Blob, creating defaults...');
    const defaults = createDefaultUsers();
    await saveUsersToBlob(defaults);
    return defaults;
  } catch (error) {
    console.error('Error loading users from Blob:', error);
    // Return defaults on error
    return createDefaultUsers();
  }
}

// Save users to Vercel Blob
async function saveUsersToBlob(users: UserWithPassword[]): Promise<void> {
  try {
    await put(USERS_BLOB_KEY, JSON.stringify(users, null, 2), {
      access: 'public',
      addRandomSuffix: false,
    });
    console.log('Users saved to Blob storage:', users.length);
  } catch (error) {
    console.error('Error saving users to Blob:', error);
  }
}

// Initialize users cache
async function initializeUsers(): Promise<UserWithPassword[]> {
  if (!cacheInitialized || usersCache === null) {
    usersCache = await loadUsersFromBlob();
    cacheInitialized = true;
  }
  return usersCache;
}

// Synchronous fallback for existing code (uses cache or defaults)
function getUsersSync(): UserWithPassword[] {
  if (usersCache !== null) {
    return usersCache;
  }
  // Return defaults if cache not initialized (will be updated async)
  return createDefaultUsers();
}

// User management functions

export async function getAllUsersAsync(): Promise<User[]> {
  const users = await initializeUsers();
  return users.map(({ passwordHash: _, ...user }) => user);
}

export function getAllUsers(): User[] {
  const users = getUsersSync();
  return users.map(({ passwordHash: _, ...user }) => user);
}

export async function getUserByIdAsync(id: string): Promise<User | null> {
  const users = await initializeUsers();
  const user = users.find(u => u.id === id);
  if (!user) return null;
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export function getUserById(id: string): User | null {
  const users = getUsersSync();
  const user = users.find(u => u.id === id);
  if (!user) return null;
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function getUserByEmailAsync(email: string): Promise<UserWithPassword | null> {
  const users = await initializeUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getUserByEmail(email: string): UserWithPassword | null {
  const users = getUsersSync();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function createUserAsync(
  email: string,
  name: string,
  password: string,
  role: UserRole
): Promise<User> {
  const users = await initializeUsers();
  
  // Check if email already exists
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('User with this email already exists');
  }
  
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
  usersCache = users;
  
  // Save to Blob
  await saveUsersToBlob(users);
  
  const { passwordHash: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

export function createUser(
  email: string,
  name: string,
  password: string,
  role: UserRole
): User {
  const users = getUsersSync();
  
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
  usersCache = users;
  
  // Save async (fire and forget)
  saveUsersToBlob(users).catch(err => console.error('Failed to save users:', err));
  
  const { passwordHash: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

export async function updateUserAsync(
  id: string,
  updates: Partial<Pick<User, 'name' | 'role' | 'isActive'>>
): Promise<User | null> {
  const users = await initializeUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  usersCache = users;
  
  // Save to Blob
  await saveUsersToBlob(users);
  
  const { passwordHash: _, ...userWithoutPassword } = users[index];
  return userWithoutPassword;
}

export function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'role' | 'isActive'>>
): User | null {
  const users = getUsersSync();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  users[index] = { ...users[index], ...updates };
  usersCache = users;
  
  // Save async
  saveUsersToBlob(users).catch(err => console.error('Failed to save users:', err));
  
  const { passwordHash: _, ...userWithoutPassword } = users[index];
  return userWithoutPassword;
}

export async function updateUserPasswordAsync(id: string, newPassword: string): Promise<boolean> {
  const users = await initializeUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;
  
  users[index].passwordHash = hashPassword(newPassword);
  usersCache = users;
  
  // Save to Blob
  await saveUsersToBlob(users);
  return true;
}

export function updateUserPassword(id: string, newPassword: string): boolean {
  const users = getUsersSync();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;
  
  users[index].passwordHash = hashPassword(newPassword);
  usersCache = users;
  
  // Save async
  saveUsersToBlob(users).catch(err => console.error('Failed to save users:', err));
  return true;
}

export async function updateLastLoginAsync(id: string): Promise<void> {
  const users = await initializeUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index].lastLogin = new Date().toISOString();
    usersCache = users;
    await saveUsersToBlob(users);
  }
}

export function updateLastLogin(id: string): void {
  const users = getUsersSync();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index].lastLogin = new Date().toISOString();
    usersCache = users;
    // Save async
    saveUsersToBlob(users).catch(err => console.error('Failed to save users:', err));
  }
}

export async function deleteUserAsync(id: string): Promise<boolean> {
  const users = await initializeUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;
  
  // Don't allow deleting the last admin
  const user = users[index];
  if (user.role === 'admin') {
    const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
    if (adminCount <= 1) return false;
  }
  
  users.splice(index, 1);
  usersCache = users;
  
  // Save to Blob
  await saveUsersToBlob(users);
  return true;
}

export function deleteUser(id: string): boolean {
  const users = getUsersSync();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return false;
  
  // Don't allow deleting the last admin
  const user = users[index];
  if (user.role === 'admin') {
    const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
    if (adminCount <= 1) return false;
  }
  
  users.splice(index, 1);
  usersCache = users;
  
  // Save async
  saveUsersToBlob(users).catch(err => console.error('Failed to save users:', err));
  return true;
}

// Force reload from Blob (useful for syncing)
export async function reloadUsers(): Promise<void> {
  cacheInitialized = false;
  usersCache = null;
  await initializeUsers();
}