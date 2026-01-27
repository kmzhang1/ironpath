import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  User,
  Calendar,
  Activity,
  TrendingUp,
  Calculator,
  Download,
  LogOut,
  Dumbbell,
  BookOpen,
  Moon,
  Sun
} from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: { name: string; email: string };
  onNavigate: (tab: any) => void;
  onAction: (action: string) => void;
  activeTab: string;
}

export function AppSidebar({ user, onNavigate, onAction, activeTab, ...props }: AppSidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" {...props} className="overflow-hidden">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => onNavigate('dashboard')}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Dumbbell className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">IronPath</span>
                <span className="truncate text-xs">AI Coach</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'dashboard'}
              onClick={() => onNavigate('dashboard')}
              tooltip="Dashboard"
            >
              <LayoutDashboard />
              <span className="truncate">Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'profile'}
              onClick={() => onNavigate('profile')}
              tooltip="Profile"
            >
              <User />
              <span className="truncate">Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onAction('switch-program')}
              tooltip="Switch Program"
            >
              <BookOpen />
              <span className="truncate">Switch Program</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="my-2" />
        
        <SidebarMenu>
           <span className="px-2 py-2 text-xs font-medium text-muted-foreground truncate">Actions</span>
           <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onAction('checkin-daily')}>
              <Calendar />
              <span className="truncate">Daily Check-In</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onAction('checkin-weekly')}>
              <Activity />
              <span className="truncate">Weekly Check-In</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onAction('update-maxes')}>
              <TrendingUp />
              <span className="truncate">Update 1RMs</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onAction('utilities')}>
              <Calculator />
              <span className="truncate">Utilities</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton onClick={() => onAction('export')}>
              <Download />
              <span className="truncate">Export Data</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
              <span className="truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onAction('logout')}
              className="text-destructive hover:text-destructive"
            >
              <LogOut />
              <span className="truncate">Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}