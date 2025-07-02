import { useState } from 'react';
import { useLocation } from 'wouter';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      if (userCredential.user.email === 'admin@voca.my') {
        // Optionally set a session/localStorage flag for admin
        localStorage.setItem('adminSession', JSON.stringify({ uid: userCredential.user.uid }));
        setLocation('/admin-dashboard');
      } else {
        setError('Not an admin account.');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid admin credentials.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black/90 to-gray-900/90 font-jakarta">
      <form onSubmit={handleLogin} className="bg-white/90 rounded-xl shadow-xl p-8 w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-navy text-center">Admin Login</h2>
        <div className="mb-4">
          <label className="block text-navy font-semibold mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 rounded-lg border border-gold focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="admin@voca.my"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-navy font-semibold mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-4 py-2 rounded-lg border border-gold focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Password"
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
        <button
          type="submit"
          className="w-full bg-gold text-navy font-bold py-2 rounded-lg hover:bg-gold-light transition-all"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login as Admin'}
        </button>
        <button
          type="button"
          className="w-full mt-4 bg-gray-200 text-navy font-semibold py-2 rounded-lg hover:bg-gray-300 transition-all"
          onClick={() => setLocation('/login')}
        >
          Back to User Login
        </button>
      </form>
    </div>
  );
} 