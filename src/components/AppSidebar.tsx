import {
  LayoutDashboard, Upload, Users, BookOpen, Megaphone,
  CheckSquare, BarChart3, Settings, Zap, LogOut
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const navItems = [
  { title: 'Dashboard', url: '/app', icon: LayoutDashboard },
  { title: 'Import', url: '/app/import', icon: Upload },
  { title: 'Leads', url: '/app/leads', icon: Users },
  { title: 'Playbooks', url: '/app/playbooks', icon: BookOpen },
  { title: 'Campaigns', url: '/app/campaigns', icon: Megaphone },
  { title: 'Approvals', url: '/app/approvals', icon: CheckSquare },
  { title: 'Analytics', url: '/app/analytics', icon: BarChart3 },
  { title: 'Settings', url: '/app/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border pb-4">
        <div className="flex items-center gap-2 px-2">
          <Zap className="h-6 w-6 text-primary shrink-0" />
          {!collapsed && <span className="font-bold text-lg tracking-tight">ReviveOS</span>}
        </div>
        {!collapsed && workspaces.length > 0 && (
          <Select
            value={currentWorkspace?.id}
            onValueChange={(val) => {
              const ws = workspaces.find(w => w.id === val);
              if (ws) setCurrentWorkspace(ws);
            }}
          >
            <SelectTrigger className="mt-2 h-8 text-xs">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map(ws => (
                <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/app'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <p className="text-xs text-muted-foreground px-2 py-1">
            © 2026 ReviveOS
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
