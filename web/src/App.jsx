import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Business
import BusinessLayout from './pages/business/Layout';
import Dashboard from './pages/business/Dashboard';
import PostJob from './pages/business/PostJob';
import Jobs from './pages/business/Jobs';
import JobDetail from './pages/business/JobDetail';
import Invoices from './pages/business/Invoices';
import Wallet from './pages/business/Wallet';
import Profile from './pages/business/Profile';
import PaymentQR from './pages/business/PaymentQR';
import PickupQR from './pages/business/PickupQR';
import DeliveryTracking from './pages/business/DeliveryTracking';
import BusinessOnboarding from './pages/business/Onboarding';
import Listings from './pages/business/Listings';
import Marketplace from './pages/business/Marketplace';

// Driver
import DriverDashboard from './pages/driver/Dashboard';

// Admin
import AdminLayout from './pages/admin/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminJobs from './pages/admin/Jobs';
import AdminDrivers from './pages/admin/Drivers';
import AdminDisputes from './pages/admin/Disputes';
import AdminAnalytics from './pages/admin/Analytics';
import ScanAnalytics from './pages/admin/ScanAnalytics';
import DriverApproval from './pages/admin/DriverApproval';
import BusinessApproval from './pages/admin/BusinessApproval';
import LiveMap from './pages/admin/LiveMap';
import Zones from './pages/admin/Zones';

// Public
import LandingPage from './pages/Landing';
import TrackingPage from './pages/Track';
import RecipientTracking from './pages/RecipientTracking';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import AccountDeletion from './pages/AccountDeletion';
import Support from './pages/Support';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#F7F3EB', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'2px solid #1B4332', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style:{ background:'#FDFBF6', color:'#1A1A1A', border:'1px solid #E4DCC9', borderRadius:'6px', fontSize:'14px' } }} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/track/:token" element={<TrackingPage />} />
          <Route path="/r/:deliveryCode" element={<RecipientTracking />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/account-deletion" element={<AccountDeletion />} />
          <Route path="/data-deletion" element={<AccountDeletion />} />
          <Route path="/support" element={<Support />} />
          <Route path="/aide" element={<Support />} />
          <Route path="/help" element={<Support />} />
          <Route path="/contact" element={<Support />} />

          {/* Business standalone screens */}
          <Route path="/pay/:id" element={<ProtectedRoute role="BUSINESS"><PaymentQR /></ProtectedRoute>} />
          <Route path="/pickup-qr/:id" element={<ProtectedRoute role="BUSINESS"><PickupQR /></ProtectedRoute>} />
          <Route path="/track-delivery/:id" element={<ProtectedRoute role="BUSINESS"><DeliveryTracking /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute role="BUSINESS"><BusinessOnboarding /></ProtectedRoute>} />

          {/* Business dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute role="BUSINESS"><BusinessLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="post-job" element={<PostJob />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="listings" element={<Listings />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Driver */}
          <Route path="/driver" element={<ProtectedRoute role="DRIVER"><DriverDashboard /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="live-map" element={<LiveMap />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="drivers" element={<AdminDrivers />} />
            <Route path="driver-approval" element={<DriverApproval />} />
            <Route path="business-approval" element={<BusinessApproval />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="scan-analytics" element={<ScanAnalytics />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="zones" element={<Zones />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
