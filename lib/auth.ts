// lib/auth.ts

import { User, UserRole } from '@/types/auth';
import crypto from 'crypto';

// Simple JWT-like token generation (for production, use proper JWT library)
const SECRET_KEY = process.env.AUTH_SECRET || 'nsib-motor-quote-secret-key-2024';

export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  };
  
  // Base64 encode the payload
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(base64Payload)
    .digest('base64url')
    .slice(0, 32);
  
  return `${base64Payload}.${signature}`;
}

export function verifyToken(token: string): { userId: string; email: string; role: UserRole } | null {
  try {
    const [base64Payload, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(base64Payload)
      .digest('base64url')
      .slice(0, 32);
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString());
    
    // Check expiration
    if (payload.exp < Date.now()) {
      return null;
    }
    
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// Proper password hashing using crypto
export function hashPassword(password: string): string {
  const salt = 'nsib-salt-2024';
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Cookie helpers
export function createAuthCookie(token: string): string {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
  return `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${expires}`;
}

export function clearAuthCookie(): string {
  return 'auth_token=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const authCookie = cookies.find(c => c.startsWith('auth_token='));
  
  if (!authCookie) return null;
  
  return authCookie.split('=')[1];
}
