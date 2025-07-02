import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Practice from "@/pages/practice";
import Search from "@/pages/search";
import BrandDetails from "@/pages/brand-details";
import AIFeedback from "@/pages/ai-feedback";
import NotFound from "@/pages/not-found";
import GamePage from "@/pages/game";
import StreakPage from "@/pages/streak";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";

// Route wrappers
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  if (loading) return null;
  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  if (loading) return null;
  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }
  return <Component />;
}

function Router() {
  const { isAuthenticated, loading } = useAuth();

  console.log('Router state:', { isAuthenticated, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Admin routes always available */}
      <Route path="/admin-login"> <AdminLogin /> </Route>
      <Route path="/admin-dashboard"> <AdminDashboard /> </Route>

      {/* Public routes (redirect if logged in) */}
      <Route path="/"> <PublicRoute component={Landing} /> </Route>
      <Route path="/login"> <PublicRoute component={Login} /> </Route>
      <Route path="/signup"> <PublicRoute component={Signup} /> </Route>

      {/* Protected routes (redirect if not logged in) */}
      <Route path="/dashboard"> <ProtectedRoute component={Dashboard} /> </Route>
      <Route path="/search"> <ProtectedRoute component={Search} /> </Route>
      <Route path="/practice"> <ProtectedRoute component={Practice} /> </Route>
      <Route path="/ai-feedback"> <ProtectedRoute component={AIFeedback} /> </Route>
      <Route path="/brand/:name"> <ProtectedRoute component={BrandDetails} /> </Route>
      <Route path="/game"> <ProtectedRoute component={GamePage} /> </Route>
      <Route path="/streak"> <ProtectedRoute component={StreakPage} /> </Route>

      {/* Catch-all: 404 for truly invalid routes */}
      <Route> <NotFound /> </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
