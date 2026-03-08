import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { LogOut, AlertTriangle } from 'lucide-react';

export default function AppLayout() {
  const { signOut, user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const isSuspended = currentWorkspace?.ai_suspended === true;
  const suspendedReason = currentWorkspace?.ai_suspended_reason;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="ml-0" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email}
              </span>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {isSuspended && (
            <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">AI Access Suspended</p>
                <p className="text-sm text-destructive/80 mt-0.5">
                  {suspendedReason || 'Your AI features have been temporarily suspended.'}
                  {' '}Please contact{' '}
                  <a href="mailto:support@reviveos.com" className="underline font-medium text-destructive hover:text-destructive/70">
                    support@reviveos.com
                  </a>
                  {' '}for assistance.
                </p>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
