import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { currentWorkspace, loading: wsLoading } = useWorkspace();
  const [adminCheck, setAdminCheck] = useState<{ checked: boolean; isAdmin: boolean }>({ checked: !requireAdmin, isAdmin: false });

  useEffect(() => {
    if (!requireAdmin || !user) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .then(({ data }) => {
        setAdminCheck({ checked: true, isAdmin: (data?.length ?? 0) > 0 });
      });
  }, [user, requireAdmin]);

  if (loading || wsLoading || !adminCheck.checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireAdmin && !adminCheck.isAdmin) {
    return <Navigate to="/app" replace />;
  }

  // Redirect to onboarding if not completed
  if (!requireAdmin && currentWorkspace && !currentWorkspace.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
