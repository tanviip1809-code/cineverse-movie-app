import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MovieDetails from "./pages/MovieDetails";
import MyList from "./pages/MyList";
import ProfileDashboard from "./pages/ProfileDashboard";
import WatchParty from "./pages/WatchParty";

function AppRoutes() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Navbar />

      <Routes>
        {/* 🔒 Protected — only accessible when logged in */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/movie/:id"
          element={
            <ProtectedRoute>
              <MovieDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-list"
          element={
            <ProtectedRoute>
              <MyList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/watch/:roomId"
          element={
            <ProtectedRoute>
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