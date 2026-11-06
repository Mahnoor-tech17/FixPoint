import {
  Briefcase,
  Layers,
  LayoutDashboard,
  UserCheck,
  Users,
  Calendar,
  Wrench,
  Star,
  BarChart3,
  Settings,
  CreditCard,
} from "lucide-react";
import DashboardLayout from "../common/DashboardLayout";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/bookings", label: "Bookings", icon: Calendar },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/providers", label: "Providers", icon: Briefcase },
  { to: "/admin/provider-requests", label: "Provider requests", icon: UserCheck },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/admin/categories", label: "Categories", icon: Layers },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ title, children }) {
  return (
    <DashboardLayout title={title} navItems={navItems}>
      {children}
    </DashboardLayout>
  );
}
