import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Report from './pages/Report'
import ComplaintDetail from './pages/ComplaintDetail'
import Pickup from './pages/Pickup'
import Assistant from './pages/Assistant'
import AdminDashboard from './pages/AdminDashboard'
import AdminComplaint from './pages/AdminComplaint'

function RequireAuth({ children }) {
  const { profile, loading } = useAuth()
  if (loading) {
    return <div>Loading...</div>
  }
  if (!profile) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RequireAdmin({ children }) {
  const { profile, loading } = useAuth()
  if (loading) {
    return <div>Loading...</div>
  }
  if (!profile) {
    return <Navigate to="/login" replace />
  }
  if (profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/report"
        element={
          <RequireAuth>
            <Report />
          </RequireAuth>
        }
      />
      <Route
        path="/complaint/:id"
        element={
          <RequireAuth>
            <ComplaintDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/pickup"
        element={
          <RequireAuth>
            <Pickup />
          </RequireAuth>
        }
      />
      <Route
        path="/assistant"
        element={
          <RequireAuth>
            <Assistant />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/complaint/:id"
        element={
          <RequireAdmin>
            <AdminComplaint />
          </RequireAdmin>
        }
      />
    </Routes>
  )
}
