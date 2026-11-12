import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute, PublicRoute } from "./private-route";

// Public pages
import LandingPage from "../pages/customer/LandingPage";
import SearchPage from "../pages/customer/SearchPage";
import PublicProviderProfile from "../pages/customer/PublicProviderProfile";

// Auth pages
import Login from "../pages/customer/Login";
import Register from "../pages/customer/Register";
import VerifyEmail from "../pages/customer/VerifyEmail";
import ForgotPassword from "../pages/customer/ForgotPassword";
import ResetPassword from "../pages/customer/ResetPassword";

// Customer pages
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerSearchPage from "../pages/customer/CustomerSearchPage";
import CustomerBookings from "../pages/customer/CustomerBookings";
import CustomerBookingDetails from "../pages/customer/CustomerBookingDetails";
import CustomerReviews from "../pages/customer/CustomerReviews";
import CustomerProfile from "../pages/customer/CustomerProfile";
import ProviderBooking from "../pages/customer/ProviderBooking";
import CustomerPaymentSuccess from "../pages/customer/CustomerPaymentSuccess";
import CustomerPaymentCancelled from "../pages/customer/CustomerPaymentCancelled";
import CustomerPayments from "../pages/customer/CustomerPayments";

// Provider pages
import ProviderDashboard from "../pages/provider/ProviderDashboard";
import ProviderBookings from "../pages/provider/ProviderBookings";
import ProviderCalendar from "../pages/provider/ProviderCalendar";
import ProviderCustomers from "../pages/provider/ProviderCustomers";
import ProviderReviews from "../pages/provider/ProviderReviews";
import ProviderProfile from "../pages/provider/ProviderProfile";
import ProviderVerification from "../pages/provider/ProviderVerification";
import ProviderAvailability from "../pages/provider/ProviderAvailability";
import ProviderSettings from "../pages/provider/ProviderSettings";
import ProviderPaymentSuccess from "../pages/provider/ProviderPaymentSuccess";
import ProviderPaymentCancelled from "../pages/provider/ProviderPaymentCancelled";
import ProviderPayments from "../pages/provider/ProviderPayments";

// Admin pages
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminBookings from "../pages/admin/AdminBookings";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminProviders from "../pages/admin/AdminProviders";
import AdminProviderRequests from "../pages/admin/AdminProviderRequests";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminReviews from "../pages/admin/AdminReviews";
import AdminReports from "../pages/admin/AdminReports";
import AdminSettings from "../pages/admin/AdminSettings";
import AdminPayments from "../pages/admin/AdminPayments";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public & Discovery */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/providers/:id" element={<PublicProviderProfile />} />

        {/* Auth (Public Only) */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Customer Portal */}
        <Route
          path="/customer/dashboard"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/search"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerSearchPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/bookings"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerBookings />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/bookings/:id"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerBookingDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/reviews"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerReviews />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/providers/:id"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <ProviderBooking />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/payment-success"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerPaymentSuccess />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/payment-cancelled"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerPaymentCancelled />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/payments"
          element={
            <PrivateRoute allowedRoles={["CUSTOMER"]}>
              <CustomerPayments />
            </PrivateRoute>
          }
        />

        {/* Provider Portal */}
        <Route
          path="/provider/dashboard"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/bookings"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderBookings />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/calendar"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderCalendar />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/customers"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderCustomers />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/reviews"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderReviews />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/profile"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/profile/complete"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/verification"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderVerification />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/availability"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderAvailability />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/settings"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/payment-success"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderPaymentSuccess />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/payment-cancelled"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderPaymentCancelled />
            </PrivateRoute>
          }
        />
        <Route
          path="/provider/payments"
          element={
            <PrivateRoute allowedRoles={["PROVIDER"]}>
              <ProviderPayments />
            </PrivateRoute>
          }
        />

        {/* Admin Portal */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminBookings />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminCategories />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/providers"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminProviders />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/provider-requests"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminProviderRequests />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminUsers />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminReviews />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminReports />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminPayments />
            </PrivateRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}