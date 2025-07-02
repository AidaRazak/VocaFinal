import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { collection, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, getAuth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import brandsData from '@/data/brands.json';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ username: '', email: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [brandStats, setBrandStats] = useState<any[]>([]);
  const [brandSearch, setBrandSearch] = useState('');
  const [overallUsage, setOverallUsage] = useState(0);

  // Check if user is authenticated as admin (Firebase Auth + localStorage)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const adminSession = localStorage.getItem('adminSession');
        if (adminSession) {
          const session = JSON.parse(adminSession);
          if (session.uid === user.uid) {
            setIsAdmin(true);
            setAdminLoading(false);
            return;
          }
        }
      }
      setIsAdmin(false);
      setAdminLoading(false);
      navigate('/admin-login');
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch users only if admin is authenticated
  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        setLoading(true);
        try {
          const usersCol = collection(db, 'users');
          const usersSnap = await getDocs(usersCol);
          const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsers(usersList);
        } catch (error) {
          console.error('Error fetching users:', error);
        }
        setLoading(false);
      };
      fetchUsers();
    }
  }, [isAdmin]);

  // Fetch brand stats from Firestore for real-time updates
  useEffect(() => {
    if (isAdmin) {
      const unsubscribe = onSnapshot(collection(db, 'brandStats'), (snapshot) => {
        const stats: any[] = [];
        snapshot.forEach(doc => {
          stats.push({ name: doc.id, ...doc.data() });
        });
        setBrandStats(stats);
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleEdit = (userId: string) => {
    console.log('Edit button clicked for user:', userId);
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditUser(user);
      setEditForm({ username: user.username || '', email: user.email || '' });
      setEditError('');
      setEditModalOpen(true);
    }
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async () => {
    console.log('Saving edits for user:', editUser?.id, editForm);
    if (!editForm.username.trim() || !editForm.email.trim()) {
      setEditError('Username and email are required.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    const auth = getAuth();
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', editUser.id), {
          username: editForm.username,
          email: editForm.email
        });
        setUsers(users.map(u => u.id === editUser.id ? { ...u, username: editForm.username, email: editForm.email } : u));
        setEditModalOpen(false);
        setEditUser(null);
      } catch (error) {
        setEditError('Failed to update user.');
      } finally {
        setEditLoading(false);
      }
    } else {
      setEditError('Not authenticated: skipping Firestore write');
      return;
    }
  };

  const handleEditCancel = () => {
    setEditModalOpen(false);
    setEditUser(null);
  };

  const handleDelete = async (userId: string) => {
    console.log('Delete button clicked for user:', userId);
    if (window.confirm('Are you sure you want to delete this user?')) {
      const authDel = getAuth();
      if (authDel.currentUser) {
        try {
          await deleteDoc(doc(db, 'users', userId));
          setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
          alert('Failed to delete user');
        }
      } else {
        alert('Not authenticated: skipping Firestore delete');
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('adminSession');
    await signOut(auth);
    navigate('/admin-login');
  };

  // Aggregate brand stats from all users' accuracyByBrand fields
  const aggregateBrandStats = () => {
    const brandMap: Record<string, { practiced: number; totalAccuracy: number; avgAccuracy: number; displayName: string }> = {};
    // Add all brands from brands.json first
    brandsData.forEach((brand: any) => {
      brandMap[brand.name.toLowerCase()] = { practiced: 0, totalAccuracy: 0, avgAccuracy: 0, displayName: brand.name };
    });
    // Add/aggregate all brands found in user data
    users.forEach((user: any) => {
      const acc = user.accuracyByBrand || {};
      Object.entries(acc).forEach(([brand, accuracyOrObj]: [string, any]) => {
        const key = brand.toLowerCase();
        // Use display name from brands.json if available, otherwise use the key
        const displayBrand = brandsData.find((b: any) => b.name.toLowerCase() === key);
        const displayName = displayBrand ? displayBrand.name : brand;
        if (!brandMap[key]) {
          brandMap[key] = { practiced: 0, totalAccuracy: 0, avgAccuracy: 0, displayName };
        }
        // If value is a number, use it. If it's an object, use the first value.
        let accuracy = 0;
        if (typeof accuracyOrObj === 'number') {
          accuracy = accuracyOrObj;
        } else if (typeof accuracyOrObj === 'object' && accuracyOrObj !== null) {
          const firstVal = Object.values(accuracyOrObj)[0];
          if (typeof firstVal === 'number') accuracy = firstVal;
        }
        if (accuracy > 0) {
          brandMap[key].practiced += 1;
          brandMap[key].totalAccuracy += accuracy;
        }
      });
    });
    // Compute avgAccuracy
    Object.keys(brandMap).forEach((brand) => {
      const stat = brandMap[brand];
      stat.avgAccuracy = stat.practiced > 0 ? Math.round(stat.totalAccuracy / stat.practiced) : 0;
    });
    return Object.values(brandMap);
  };

  const mergedBrandStats = aggregateBrandStats();
  const filteredBrandStats = mergedBrandStats.filter(brand =>
    brand.displayName.toLowerCase().includes(brandSearch.toLowerCase())
  );

  // Chart data
  const chartData = {
    labels: filteredBrandStats.map(b => b.displayName),
    datasets: [
      {
        label: 'Users Practiced',
        data: filteredBrandStats.map(b => b.practiced),
        backgroundColor: 'rgba(118, 75, 162, 0.7)',
      },
      {
        label: 'Avg Accuracy',
        data: filteredBrandStats.map(b => b.avgAccuracy),
        backgroundColor: 'rgba(255, 215, 0, 0.7)',
        yAxisID: 'y1',
      }
    ]
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Brand Practice & Accuracy' },
      tooltip: { mode: 'index' as const, intersect: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Users Practiced' },
        max: 5 // Set max to 5 for better proportional display
      },
      y1: {
        beginAtZero: true,
        position: 'right' as const,
        title: { display: true, text: 'Avg Accuracy (%)' },
        grid: { drawOnChartArea: false },
        min: 0,
        max: 100
      }
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream via-offwhite to-cream font-jakarta">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-lg text-navy">Checking admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-offwhite to-cream font-jakarta">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl md:text-6xl font-playfair font-bold text-navy gold drop-shadow mb-2">Admin Dashboard</h1>
          <button className="px-6 py-3 rounded-full bg-navy hover:bg-teal text-gold font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-gold" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div className="glassmorphic rounded-3xl p-8 md:p-12 shadow-2xl border border-gold/20 mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-navy mb-6">Brand History</h2>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <input
              type="text"
              className="brand-search-input px-4 py-2 rounded-xl border border-gold/30 focus:ring-2 focus:ring-gold focus:outline-none text-navy bg-white/80 placeholder:text-navy/40 w-full md:w-80"
              placeholder="Search brand..."
              value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
            />
          </div>
          <div className="bg-white/70 rounded-2xl p-6 shadow-lg border border-gold/10 mb-8">
            <Bar data={chartData} options={chartOptions} height={320} />
          </div>
        </div>
        <div className="glassmorphic rounded-3xl p-8 md:p-12 shadow-2xl border border-gold/20 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-navy mb-6">Users Management</h2>
          {loading ? (
            <div className="text-lg text-navy">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white/80 rounded-xl shadow-lg border border-gold/10">
                <thead>
                  <tr className="bg-gold/20 text-navy font-bold">
                    <th className="px-6 py-3 text-left">Username</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Streak</th>
                    <th className="px-6 py-3 text-left">Score</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className={user.deactivated ? 'bg-red-100 text-gray-400' : 'hover:bg-gold/10 transition'}>
                      <td className="px-6 py-3 font-semibold">{user.username || '—'}</td>
                      <td className="px-6 py-3">{user.email}</td>
                      <td className="px-6 py-3">{user.streakCount ?? 0}</td>
                      <td className="px-6 py-3">{user.gameScore ?? 0}</td>
                      <td className="px-6 py-3">
                        <button className="px-4 py-2 rounded-lg bg-gold text-navy font-bold mr-2 hover:bg-gold-light transition" onClick={() => handleEdit(user.id)}>Edit</button>
                        <button className="px-4 py-2 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition" onClick={() => handleDelete(user.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl min-w-[320px] max-w-md relative">
            <button onClick={handleEditCancel} className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-red-500">×</button>
            <h3 className="text-2xl font-bold mb-4 text-navy font-playfair">Edit User</h3>
            <div className="mb-4">
              <label className="block text-navy font-semibold mb-1">Username</label>
              <input
                type="text"
                name="username"
                value={editForm.username}
                onChange={handleEditFormChange}
                required
                autoFocus
                tabIndex={0}
                className="w-full px-4 py-2 rounded-lg border border-gold/30 focus:ring-2 focus:ring-gold focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-navy font-semibold mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditFormChange}
                required
                tabIndex={0}
                className="w-full px-4 py-2 rounded-lg border border-gold/30 focus:ring-2 focus:ring-gold focus:outline-none"
              />
            </div>
            {editError && <div className="text-red-500 mb-2">{editError}</div>}
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={handleEditSave} disabled={editLoading} className="px-6 py-2 rounded-lg bg-gold text-navy font-bold hover:bg-gold-light transition">
                {editLoading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleEditCancel} className="px-6 py-2 rounded-lg bg-gray-200 text-navy font-bold hover:bg-gray-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <footer className="fixed inset-x-0 bottom-0 flex justify-center py-6 bg-white/80 backdrop-blur-md z-20 border-t border-gold/20 glassmorphic">
        <span className="text-navy font-jakarta text-lg">&copy; {new Date().getFullYear()} Voca Admin Dashboard</span>
      </footer>
    </div>
  );
};

export default AdminDashboard; 