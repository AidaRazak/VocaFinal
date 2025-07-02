import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const { signInWithEmail, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, loading, setLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('Starting login process...');
      await signInWithEmail(formData.email, formData.password);
      console.log('Login successful!');
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to Voca.",
      });
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = "An error occurred during login.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      }

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black/90 to-gray-900/90 font-jakarta relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gold/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gold/10 rounded-full blur-2xl animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 glassmorphic">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-playfair font-bold text-gold">Voca</h1>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="text-white hover:text-gold">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Login Section */}
      <div className="flex items-center justify-center min-h-screen px-4 relative z-10 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card className="glassmorphic-dark border-gold/20 shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <CardTitle className="text-3xl font-playfair font-bold text-white mb-2">
                Welcome Back
              </CardTitle>
              <p className="text-white/80 font-jakarta">
                Log in to continue your pronunciation journey
              </p>
            </CardHeader>
            <CardContent className="pb-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/90">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-gold"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/90">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-gold pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gold hover:bg-gold-light text-black font-semibold py-3 text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
                  size="lg"
                >
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>

                <div className="text-center">
                  <p className="text-white/60 text-sm">
                    Don't have an account?{' '}
                    <Link href="/signup">
                      <span className="text-gold hover:text-gold-light font-medium cursor-pointer">
                        Sign up here
                      </span>
                    </Link>
                  </p>
                  <div className="mt-4 flex flex-col gap-2 items-center">
                    <Link href="/admin-login">
                      <button
                        type="button"
                        className="text-xs px-4 py-2 rounded-lg bg-navy/80 text-gold border border-gold hover:bg-gold hover:text-navy font-semibold transition-all duration-200"
                        style={{ marginTop: '0.5rem' }}
                      >
                        Admin Login
                      </button>
                    </Link>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}