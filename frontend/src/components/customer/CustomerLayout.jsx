import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  Search,
  Star,
  User,
} from "lucide-react";
import DashboardLayout from "../common/DashboardLayout";

const navItems = [
  { to: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customer/search", label: "Browse Services", icon: Search },
  { to: "/customer/bookings", label: "My Bookings", icon: Calendar },
  { to: "/customer/reviews", label: "My Reviews", icon: Star },
  { to: "/customer/payments", label: "Payments", icon: CreditCard },
  { to: "/customer/profile", label: "Profile", icon: User },
];

export default function CustomerLayout({ title, children }) {
  return (
    <DashboardLayout title={title} navItems={navItems}>
      {children}
    </DashboardLayout>
  );
}
