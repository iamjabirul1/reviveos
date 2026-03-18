import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/app/Dashboard";
import ImportPage from "./pages/app/Import";
import LeadsPage from "./pages/app/Leads";
import PlaybooksPage from "./pages/app/PlaybooksPage";
import CampaignsPage from "./pages/app/Campaigns";
import ApprovalsPage from "./pages/app/Approvals";
import AnalyticsPage from "./pages/app/AnalyticsPage";
import RevenuePage from "./pages/app/RevenuePage";
import AIInsightsPage from "./pages/app/AIInsightsPage";
import SettingsPage from "./pages/app/Settings";
import AdminDashboard from "./pages/app/AdminDashboard";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Discover from "./pages/Discover";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                  <Route path="import" element={<ErrorBoundary><ImportPage /></ErrorBoundary>} />
                  <Route path="leads" element={<ErrorBoundary><LeadsPage /></ErrorBoundary>} />
                  <Route path="playbooks" element={<ErrorBoundary><PlaybooksPage /></ErrorBoundary>} />
                  <Route path="campaigns" element={<ErrorBoundary><CampaignsPage /></ErrorBoundary>} />
                  <Route path="approvals" element={<ErrorBoundary><ApprovalsPage /></ErrorBoundary>} />
                  <Route path="analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
                  <Route path="revenue" element={<ErrorBoundary><RevenuePage /></ErrorBoundary>} />
                  <Route path="ai-insights" element={<ErrorBoundary><AIInsightsPage /></ErrorBoundary>} />
                  <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
                  <Route path="admin" element={<ProtectedRoute requireAdmin><ErrorBoundary><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

