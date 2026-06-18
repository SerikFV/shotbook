import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './i18n'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import MobilographersPage from './pages/client/MobilographersPage'
import MobilographerProfile from './pages/client/MobilographerProfile'
import FavoritesPage from './pages/client/FavoritesPage'
import BookingsPage from './pages/BookingsPage'
import MessagesPage from './pages/MessagesPage'
import CalendarPage from './pages/mobilographer/CalendarPage'
import AnalyticsPage from './pages/mobilographer/AnalyticsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/admin/AdminPage'
import ExplorePage from './pages/ExplorePage'

function PrivateRoute({ children, roles }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" />
  if (user && !user.is_email_verified) return <Navigate to="/verify-email" />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />
  return children
}

function RedirectWithParams({ to }) {
  const params = Object.fromEntries(
    Object.entries(useParams()).map(([k, v]) => [`:${k}`, v])
  )
  let path = to
  Object.entries(params).forEach(([k, v]) => { path = path.replace(k, v) })
  return <Navigate to={path} replace />
}

export default function App() {
  const { user } = useAuthStore()

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1A1A1A', color: '#fff', border: '1px solid #333' }
        }}
      />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Ескі /home/* маршруттарын жаңаға аудару */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/home/mobilographers" element={<Navigate to="/mobilographers" replace />} />
        <Route path="/home/mobilographers/:id" element={<RedirectWithParams to="/mobilographers/:id" />} />
        <Route path="/home/bookings" element={<Navigate to="/bookings" replace />} />
        <Route path="/home/messages" element={<Navigate to="/messages" replace />} />
        <Route path="/home/messages/:userId" element={<RedirectWithParams to="/messages/:userId" />} />
        <Route path="/home/calendar" element={<Navigate to="/calendar" replace />} />
        <Route path="/home/analytics" element={<Navigate to="/analytics" replace />} />
        <Route path="/home/profile" element={<Navigate to="/profile" replace />} />
        <Route path="/home/settings" element={<Navigate to="/settings" replace />} />
        <Route path="/home/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/home/*" element={<Navigate to="/" replace />} />

        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />

        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="mobilographers" element={<MobilographersPage />} />
          <Route path="mobilographers/:id" element={<MobilographerProfile />} />
          <Route path="favorites" element={<PrivateRoute roles={['client']}><FavoritesPage /></PrivateRoute>} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="messages/:userId" element={<MessagesPage />} />
          <Route path="calendar" element={<PrivateRoute roles={['mobilographer','admin']}><CalendarPage /></PrivateRoute>} />
          <Route path="analytics" element={<PrivateRoute roles={['mobilographer','admin']}><AnalyticsPage /></PrivateRoute>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<PrivateRoute roles={['admin']}><AdminPage /></PrivateRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
