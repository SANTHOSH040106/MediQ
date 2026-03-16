import { Home, Calendar, Search, User, Shield, Stethoscope } from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

export const BottomNavigation = () => {
  const { isAdmin, isDoctor, loading } = useUserRole();

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    ...(isAdmin ? [{ to: "/admin", icon: Shield, label: "Admin" }] : []),
    ...(isDoctor ? [{ to: "/doctor-dashboard", icon: Stethoscope, label: "Queue" }] : []),
    { to: "/appointments", icon: Calendar, label: "Appointments" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-5 w-5", isActive && "fill-primary")} />
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
};
