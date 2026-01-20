// app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { getAllUsers, createUser, updateUser, deleteUser } from '@/lib/users';
import { hasPermission, UserRole } from '@/types/auth';

// Middleware to check admin access
function checkAdminAccess(request: NextRequest): { authorized: boolean; userId?: string; role?: UserRole; error?: string } {
  const cookieHeader = request.headers.get('cookie');
  const token = getTokenFromCookie(cookieHeader);

  if (!token) {
    return { authorized: false, error: 'Not authenticated' };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { authorized: false, error: 'Invalid or expired token' };
  }

  if (!hasPermission(decoded.role, 'canManageUsers')) {
    return { authorized: false, error: 'Insufficient permissions' };
  }

  return { authorized: true, userId: decoded.userId, role: decoded.role };
}

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  const access = checkAdminAccess(request);
  
  if (!access.authorized) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.error === 'Not authenticated' ? 401 : 403 }
    );
  }

  const users = getAllUsers();
  return NextResponse.json({ success: true, users });
}

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
  const access = checkAdminAccess(request);
  
  if (!access.authorized) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.error === 'Not authenticated' ? 401 : 403 }
    );
  }

  try {
    const { email, name, password, role } = await request.json();

    // Validate input
    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['advisor', 'hod', 'admin'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create user
    const newUser = createUser(email, name, password, role as UserRole);

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT - Update user (admin only)
export async function PUT(request: NextRequest) {
  const access = checkAdminAccess(request);
  
  if (!access.authorized) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.error === 'Not authenticated' ? 401 : 403 }
    );
  }

  try {
    const { id, name, role, isActive } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from disabling themselves
    if (id === access.userId && isActive === false) {
      return NextResponse.json(
        { success: false, error: 'You cannot disable your own account' },
        { status: 400 }
      );
    }

    // Prevent admin from demoting themselves
    if (id === access.userId && role && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    const updates: { name?: string; role?: UserRole; isActive?: boolean } = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedUser = updateUser(id, updates);
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(request: NextRequest) {
  const access = checkAdminAccess(request);
  
  if (!access.authorized) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.error === 'Not authenticated' ? 401 : 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (id === access.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const deleted = deleteUser(id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'User not found or cannot be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
