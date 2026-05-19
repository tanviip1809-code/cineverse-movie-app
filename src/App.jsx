import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MovieDetails from "./pages/MovieDetails";
import MyList from "./pages/MyList";
import ProfileDashboard from "./pages/ProfileDashboard";
import WatchParty from "./pages/WatchParty";

// Admin
import AdminLayout from "./admin/components/AdminLayout";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminMovies from "./admin/pages/AdminMovies";
import AdminUsers from "./admin/pages/AdminUsers";
import AdminWatchRooms from "./admin/pages/AdminWatchRooms";
import AdminReviews from "./admin/pages/AdminReviews";
import AdminAnalytics from "./admin/pages/AdminAnalytics";
import AdminSettings from "./admin/pages/AdminSettings";

function AppRoutes() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <Routes>
        {/* ── Regular app routes (Navbar rendered inside) ── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navbar />
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/movie/:id"
          element={
            <ProtectedRoute>
              <Navbar />
              <MovieDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-list"
          element={
            <ProtectedRoute>
              <Navbar />
              <MyList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navbar />
              <ProfileDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/watch/:roomId"
          element={
            <ProtectedRoute>
              <Navbar />
              <WatchParty />
            </ProtectedRoute>
          }
        />

        {/* 🔓 Public — only accessible when logged OUT */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* 🛡️ Admin routes — role: "admin" required */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"  element={<AdminDashboard />} />
          <Route path="movies"     element={<AdminMovies />} />
          <Route path="users"      element={<AdminUsers />} />
          <Route path="watchrooms" element={<AdminWatchRooms />} />
          <Route path="reviews"    element={<AdminReviews />} />
          <Route path="analytics"  element={<AdminAnalytics />} />
          <Route path="settings"   element={<AdminSettings />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;