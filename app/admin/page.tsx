// app/admin/page.tsx - Admin Dashboard

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '@/types/auth';

interface SavedComparison {
  id: string;
  date: string;
  vehicle: string;
  quotes: Array<{
    id: string;
    customerName: string;
    company: string;
    total: number;
    isRenewal: boolean;
    isRecommended: boolean;
  }>;
  referenceNumber: string;
  fileUrl?: string;
  createdBy?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'files' | 'settings'>('overview');
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState<SavedComparison[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalComparisons: 0,
    todayComparisons: 0,
    activeUsers: 0,
  });

  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'advisor' as UserRole });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (!data.success) {
        router.push('/');
        return;
      }

      // Only admin can access this page
      if (data.user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setCurrentUser(data.user);
      await loadData();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.all([loadUsers(), loadHistory()]);
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setStats(prev => ({
          ...prev,
          totalUsers: data.users.length,
          activeUsers: data.users.filter((u: User) => u.isActive).length,
        }));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data.success) {
        setHistory(data.history || []);
        
        const today = new Date().toDateString();
        const todayCount = (data.history || []).filter((h: SavedComparison) => 
          new Date(h.date).toDateString() === today
        ).length;
        
        setStats(prev => ({
          ...prev,
          totalComparisons: (data.history || []).length,
          todayComparisons: todayCount,
        }));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const handleAddUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();
      if (data.success) {
        alert('User created successfully!');
        setShowAddUserModal(false);
        setNewUser({ email: '', name: '', password: '', role: 'advisor' });
        await loadUsers();
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: editingUser.name,
          role: editingUser.role,
          isActive: editingUser.isActive,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('User updated successfully!');
        setShowEditUserModal(false);
        setEditingUser(null);
        await loadUsers();
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('User deleted successfully!');
        await loadUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hod': return 'bg-purple-100 text-purple-800';
      case 'advisor': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-800 to-purple-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-600">NS</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-indigo-200 text-sm">NSIB Motor Insurance System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{currentUser?.name}</p>
                <p className="text-sm text-indigo-200">{currentUser?.email}</p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
              >
                📝 Quote Generator
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'users', label: '👥 Users', icon: '👥' },
              { id: 'files', label: '📁 All Files', icon: '📁' },
              { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-4 font-semibold transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-indigo-500">
                <div className="text-3xl font-bold text-gray-800">{stats.totalUsers}</div>
                <div className="text-gray-600">Total Users</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-green-500">
                <div className="text-3xl font-bold text-gray-800">{stats.activeUsers}</div>
                <div className="text-gray-600">Active Users</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-purple-500">
                <div className="text-3xl font-bold text-gray-800">{stats.totalComparisons}</div>
                <div className="text-gray-600">Total Comparisons</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border-l-4 border-orange-500">
                <div className="text-3xl font-bold text-gray-800">{stats.todayComparisons}</div>
                <div className="text-gray-600">Today&apos;s Comparisons</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Comparisons */}
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📁 Recent Comparisons</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {history.slice(0, 5).map((comparison) => (
                    <div key={comparison.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-800">{comparison.vehicle}</div>
                          <div className="text-sm text-gray-600">Ref: {comparison.referenceNumber}</div>
                          <div className="text-xs text-gray-500">{formatDate(comparison.date)}</div>
                        </div>
                        <div className="text-right">
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs">
                            {comparison.quotes.length} quotes
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-center text-gray-400 py-8">No comparisons yet</div>
                  )}
                </div>
              </div>

              {/* User List Preview */}
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">👥 System Users</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                          {user.role.toUpperCase()}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">User Management</h3>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                + Add New User
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Last Login</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setShowEditUserModal(true);
                            }}
                            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition"
                          >
                            Edit
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="bg-white rounded-xl shadow-md">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">All Comparisons ({history.length})</h3>
              <p className="text-gray-600 text-sm">View and manage all saved comparison files</p>
            </div>
            
            <div className="p-6">
              {history.length === 0 ? (
                <div className="text-center text-gray-400 py-16">
                  No comparison files yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.map((comparison) => (
                    <div key={comparison.id} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-indigo-400 transition">
                      <div className="mb-3">
                        <div className="font-bold text-lg text-gray-800">{comparison.vehicle}</div>
                        <div className="text-sm text-gray-600">
                          {comparison.quotes[0]?.customerName || 'Unknown Customer'}
                        </div>
                        <div className="text-xs text-indigo-600 font-mono mt-1">
                          Ref: {comparison.referenceNumber}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(comparison.date)}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-700 font-semibold mb-1">
                          {comparison.quotes.length} Quote{comparison.quotes.length !== 1 ? 's' : ''}:
                        </div>
                        <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                          {comparison.quotes.map((q, i) => (
                            <div key={i} className="truncate">
                              • {q.company} - AED {q.total?.toFixed(2) || '0.00'}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {comparison.fileUrl && (
                          <a
                            href={comparison.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-indigo-700 transition text-center"
                          >
                            🔗 View Online
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">System Settings</h3>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">System Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Version: 1.0.0</p>
                  <p>Total Users: {stats.totalUsers}</p>
                  <p>Total Comparisons: {stats.totalComparisons}</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Note</h4>
                <p className="text-sm text-yellow-700">
                  Additional settings (email notifications, backup configuration, etc.) 
                  can be added in future updates.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Add New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="Enter password (min 6 characters)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                >
                  <option value="advisor">Advisor</option>
                  <option value="hod">HOD (Head of Department)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  disabled={editingUser.id === currentUser?.id}
                >
                  <option value="advisor">Advisor</option>
                  <option value="hod">HOD (Head of Department)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.isActive}
                    onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.checked })}
                    disabled={editingUser.id === currentUser?.id}
                  />
                  <span className="text-sm font-semibold text-gray-700">Active</span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setEditingUser(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
