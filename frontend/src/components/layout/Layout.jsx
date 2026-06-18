import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { useBadgeStore } from '../../store/badgeStore'
import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import {
  Home, Calendar, BarChart2, MessageCircle,
  Bell, User, LogOut, Shield, Camera, Menu, X, Globe, Settings, Play,
  Users, AlertTriangle, Activity, Send, Sparkles
} from 'lucide-react'
import './Layout.css'

export default function Layout() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuthStore()
  const { unreadMessages, unreadNotifications, fetchAll, incrementMessages, clearNotifications } = useBadgeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [selectedSystemNotif, setSelectedSystemNotif] = useState(null)
  const notifRef = useRef(null)
  const userMenuRef = useRef(null)
  const wsRef = useRef(null)

  // Бастапқы жүктеу
  useEffect(() => {
    api.get('/notifications/').then(({ data }) => setNotifications(data)).catch(() => {})
    if (user) fetchAll()
  }, [user?.id])

  // Реалтайм notification via WebSocket
  useEffect(() => {
    if (!user) return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_WS_URL || `${proto}//${window.location.host}`
    const token = localStorage.getItem('token')
    const ws = new WebSocket(`${host}/ws/${user.id}${token ? `?token=${token}` : ''}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'notification') {
          msg.is_read = false
          setNotifications(prev => [msg, ...prev])
          // Badge арттыру
          useBadgeStore.getState().setUnreadNotifications(
            useBadgeStore.getState().unreadNotifications + 1
          )
          if (Notification.permission === 'granted') {
            new Notification(msg.title || 'ShotBook', {
              body: msg.message,
              icon: '/favicon.ico',
            })
          }
        }
        if (msg.type === 'message') {
          // Жаңа хабарлама badge
          useBadgeStore.getState().incrementMessages()
        }
      } catch {}
    }
    return () => ws.close()
  }, [user])

  // Feature 4 — Браузер notification рұқсат сұрау (бір рет)
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Dropdown сыртына басса жабылады
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleLogout = () => { logout(); navigate('/login') }

  const toggleLang = () => {
    const newLang = i18n.language === 'kk' ? 'ru' : 'kk'
    i18n.changeLanguage(newLang)
    localStorage.setItem('lang', newLang)
  }

  const handleOpenNotifs = () => {
    setShowNotifs(v => !v)
  }

    const regularNavItems = [
      { to: '/explore', icon: Play, label: 'Explore (Лента)' },
      { to: '/mobilographers', icon: Camera, label: t('mobilographers') },
      { to: '/bookings', icon: Calendar, label: t('bookings') },
      { to: '/messages', icon: MessageCircle, label: t('messages'), badge: unreadMessages },
      ...(user?.role !== 'client' ? [
        { to: '/calendar', icon: Calendar, label: t('calendar') },
        { to: '/analytics', icon: BarChart2, label: t('analytics') },
        { to: '/ideas', icon: Sparkles, label: '✨ AI Идеялар' },
      ] : []),
    ]

  const adminNavItems = [
    { to: '/admin?tab=dashboard', icon: Shield, label: 'Дашборд' },
    { to: '/explore', icon: Play, label: 'Explore (Лента)' },
    { to: '/messages', icon: MessageCircle, label: 'Чат', badge: unreadMessages },
    { to: '/admin?tab=users', icon: Users, label: 'Барлық пайдаланушылар' },
    { to: '/admin?tab=bookings', icon: Calendar, label: 'Барлық тапсырыстар' },
    { to: '/admin?tab=reports', icon: AlertTriangle, label: 'Шағымдар' },
    { to: '/admin?tab=activity', icon: Activity, label: 'Аудит (Activity)' },
    { to: '/admin?tab=broadcast', icon: Send, label: 'Хабарландыру' },
  ]

  const navItems = user?.role === 'admin' ? adminNavItems : regularNavItems

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="/favicon.svg" alt="ShotBook" style={{ width: 36, height: 36, borderRadius: 10 }} />
          <span className="logo-text">ShotBook</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, exact, badge }) => (
            <NavLink key={to} to={to} end={exact}
              className={() => {
                let active = false;
                if (to.includes('?')) {
                  const toTab = new URLSearchParams(to.split('?')[1]).get('tab');
                  const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';
                  active = location.pathname === '/admin' && toTab === currentTab;
                } else {
                  active = location.pathname.startsWith(to) && to !== '/' || location.pathname === to;
                }
                return `nav-item ${active ? 'active' : ''}`
              }}
              onClick={() => setSidebarOpen(false)}>
              <Icon size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge > 0 && (
                <span style={{
                  background: 'var(--accent)', color: 'white',
                  fontSize: 11, fontWeight: 700, minWidth: 18, height: 18,
                  borderRadius: 9, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: '0 5px',
                }}>{badge > 99 ? '99+' : badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="topbar-right">
            <button className="lang-btn" onClick={toggleLang}>
              <Globe size={16} />
              <span>{i18n.language === 'kk' ? 'KZ' : 'RU'}</span>
            </button>

            <div className="notif-wrap" ref={notifRef}>
              <button className="icon-btn" onClick={handleOpenNotifs}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span>{t('notifications')}</span>
                    <button className="read-all-btn" onClick={async () => {
                      await api.post('/notifications/read-all')
                      setNotifications(n => n.map(x => ({ ...x, is_read: true })))
                    }}>✓ All</button>
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">{t('no_data')}</div>
                    ) : notifications.slice(0, 15).map(n => (
                      <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                        onClick={() => {
                          if (!n.is_read) {
                            if (n.id) api.post(`/notifications/${n.id}/read`).catch(() => {})
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                            useBadgeStore.getState().setUnreadNotifications(Math.max(0, unreadCount - 1))
                          }
                          setShowNotifs(false)
                          if (n.notification_type === 'system') {
                            setSelectedSystemNotif(n)
                          } else {
                            navigate('/bookings')
                          }
                        }}>
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-msg">{n.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="user-chip-wrap" ref={userMenuRef}>
              <button className="user-chip" onClick={() => setShowUserMenu(v => !v)}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                  {user?.avatar
                    ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : user?.username?.[0]?.toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{user?.username}</div>
                  <div className="user-role">{user?.role}</div>
                </div>
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  <button className="user-dropdown-item" onClick={() => { setShowUserMenu(false); navigate('/home/profile') }}>
                    <User size={15} /> {t('profile')}
                  </button>
                  <button className="user-dropdown-item" onClick={() => { setShowUserMenu(false); navigate('/home/settings') }}>
                    <Settings size={15} /> {t('settings')}
                  </button>
                  <div className="user-dropdown-divider" />
                  <button className="user-dropdown-item user-dropdown-danger"
                    onClick={() => { setShowUserMenu(false); setShowLogoutConfirm(true) }}>
                    <LogOut size={15} /> {t('logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Шығу растау модалы */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: 320, padding: '28px 24px', textAlign: 'center', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <LogOut size={22} color="var(--danger)" />
            </div>
            <h3 style={{ marginBottom: 8, fontSize: 17 }}>{t('logout')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Шығуды растайсыз ба?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }}
                onClick={() => setShowLogoutConfirm(false)}>
                {t('cancel')}
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }}
                onClick={() => { setShowLogoutConfirm(false); handleLogout() }}>
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedSystemNotif && (
        <div className="modal-overlay" onClick={() => setSelectedSystemNotif(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12, fontWeight: 700 }}>{selectedSystemNotif.title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{selectedSystemNotif.message}</p>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedSystemNotif(null)}>Жабу</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
