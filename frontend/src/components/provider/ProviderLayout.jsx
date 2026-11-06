import {
  Calendar,
  CreditCard,
  FileCheck,
  LayoutDashboard,
  Settings,
  Clock,
  Users,
  Star,
} from "lucide-react";
import DashboardLayout from "../common/DashboardLayout";

const navItems = [
  { to: "/provider/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/provider/bookings", label: "Bookings", icon: Clock },
  { to: "/provider/calendar", label: "Calendar", icon: Calendar },
  { to: "/provider/availability", label: "Availability", icon: Calendar },
  { to: "/provider/customers", label: "Clients", icon: Users },
  { to: "/provider/reviews", label: "Reviews", icon: Star },
  { to: "/provider/payments", label: "Payments", icon: CreditCard },
  { to: "/provider/verification", label: "Verification", icon: FileCheck },
  { to: "/provider/settings", label: "Settings", icon: Settings },
];

export default function ProviderLayout({ title, children }) {
  return (
    <DashboardLayout title={title} navItems={navItems}>
      {children}
    </DashboardLayout>
  );
}
