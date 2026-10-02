import { NavLink, Outlet, useLocation } from "react-router"
import { KeyRoundIcon, LayoutDashboard, Network, Server } from "lucide-react"

import type { Route } from "./+types/main"
import { Separator } from "~/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "~/components/ui/sidebar"

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/network", label: "Network", icon: Network},
  { to: "/authentication", label: "Authentication", icon: KeyRoundIcon}

]

// Liest den vom SidebarProvider gesetzten Cookie, damit der
// eingeklappte Zustand schon beim Server-Rendering stimmt
export function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("Cookie") ?? ""
  const match = cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return { sidebarOpen: match ? match[1] === "true" : true }
}

function AppSidebar() {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<NavLink to="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Server className="size-4" />
              </div>
              <span className="font-semibold">Homelab</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={pathname === item.to}
                    tooltip={item.label}
                    render={
                      <NavLink
                        to={item.to}
                        end
                        onClick={() => isMobile && setOpenMobile(false)}
                      />
                    }
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          © {new Date().getFullYear()} Homelab
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export default function MainLayout({ loaderData }: Route.ComponentProps) {
  return (
    <SidebarProvider defaultOpen={loaderData.sidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <span className="font-semibold">Homelab</span>
        </header>

        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
