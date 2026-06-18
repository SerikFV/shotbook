import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Shield, Users, Calendar, AlertTriangle, Activity, Send } from 'lucide-react'

export default function AdminPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(null)
  const [activityLogs, setActivityLogs] = useState([])
  const [broadcast, setBroadcast] = useState({ target: 'all', title: '', message: '' })

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => setUsers(data)).catch(() => {})
    api.get('/admin/bookings').then(({ data }) => setBookings(data)).catch(() => {})
    api.get('/analytics/admin').then(({ data }) => setStats(data)).catch(() => {})
    api.get('/reports').then(({ data }) => setReports(data)).catch(() => {})
    api.get('/admin/activity').then(({ data }) => setActivityLogs(data)).catch(() => {})
  }, [])

  const banUser = async (id, banned) => {
    try {
      await api.post(`/admin/users/${id}/${banned ? 'unban' : 'ban'}`)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: !banned } : u))
      toast.success(t('success'))
    } catch { toast.error(t('error')) }
  }

  const toggleActive = async (id) => {
    try {
      const { data } = await api.post(`/admin/users/${id}/toggle-active`)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: data.is_active } : u))
      toast.success(t('success'))
    } catch { toast.error(t('error')) }
  }

  const resolveReport = async (id, status) => {
    try {
      await api.patch(`/reports/${id}?status=${status}`)
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      toast.success(t('success'))
    } catch { toast.error(t('error')) }
  }

  const resolveAndBan = async (report) => {
    try {
      await api.patch(`/reports/${report.id}?status=resolved`)
      await api.post(`/admin/users/${report.target_id}/ban`)
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r))
      setUsers(prev => prev.map(u => u.id === report.target_id ? { ...u, is_banned: true } : u))
      toast.success(`${report.target} бұғатталды`)
    } catch { toast.error(t('error')) }
  }

  const statusLabel = (s) => {
    const map = { new:'status_new', confirmed:'status_confirmed', shooting:'status_shooting',
      editing:'status_editing', completed:'status_completed', cancelled:'status_cancelled' }
    return t(map[s] || s)
  }

  const statCards = stats ? [
    { label: t('all_users'), value: stats.total_users, color: '#7C5CFF' },
    { label: t('mobilographers'), value: stats.total_mobilographers, color: '#3b82f6' },
    { label: 'Клиенттер', value: stats.total_clients, color: '#22c55e' },
    { label: t('bookings'), value: stats.total_bookings, color: '#f59e0b' },
    { label: t('total_revenue'), value: `${stats.total_revenue?.toLocaleString() || 0} ₸`, color: '#a855f7' },
  ] : []

  const thStyle = { padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }
  const tdStyle = { padding: '10px 12px' }
  const rowStyle = { borderBottom: '1px solid var(--border)' }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={24} color="var(--accent)" />
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>
          {tab === 'dashboard' ? 'Дашборд' : tab === 'users' ? 'Пайдаланушылар' : tab === 'bookings' ? 'Тапсырыстар' : tab === 'reports' ? 'Шағымдар' : tab === 'activity' ? 'Аудит' : tab === 'broadcast' ? 'Хабарландыру' : t('admin')}
        </h1>
      </div>

      {tab === 'dashboard' && (
        <div className="stats-grid">
          {statCards.map((c, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={rowStyle}>
                {['ID', t('username'), t('email'), 'Role', t('city'), 'Status', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={rowStyle}>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{u.id}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{u.username}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: u.role === 'admin' ? 'rgba(124,92,255,0.15)' : u.role === 'mobilographer' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
                      color: u.role === 'admin' ? 'var(--accent)' : u.role === 'mobilographer' ? '#3b82f6' : 'var(--success)'
                    }}>{u.role}</span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{u.city || '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: u.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: u.is_active ? 'var(--success)' : 'var(--danger)' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {u.is_banned && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>Banned</span>}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={`btn ${u.is_banned ? 'btn-success' : 'btn-danger'}`}
                        style={{ padding: '5px 10px', fontSize: 11 }}
                        onClick={() => banUser(u.id, u.is_banned)}>
                        {u.is_banned ? t('unban') : t('ban')}
                      </button>
                      <button className="btn btn-ghost"
                        style={{ padding: '5px 10px', fontSize: 11 }}
                        onClick={() => toggleActive(u.id)}>
                        {u.is_active ? t('deactivate') : t('activate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={rowStyle}>
                {['ID', 'Client', 'Mobilographer', t('shoot_type'), t('booking_date'), 'Status', t('total_price')].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} style={rowStyle}>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{b.id}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{b.client}</td>
                  <td style={tdStyle}>{b.mobilographer}</td>
                  <td style={tdStyle}>{b.shoot_type}</td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                    {b.booking_date ? new Date(b.booking_date).toLocaleDateString() : '—'}
                  </td>
                  <td style={tdStyle}>
                    <span className={`badge badge-${b.status}`}>{statusLabel(b.status)}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--accent)' }}>
                    {b.total_price?.toLocaleString()} ₸
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reports' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Шағымдар жоқ</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={rowStyle}>
                  {['ID', 'Шағым берген', 'Кімге', 'Себеп', 'Статус', ''].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} style={rowStyle}>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{r.id}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.reporter}</td>
                    <td style={tdStyle}>{r.target}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, color: 'var(--text-secondary)' }}>{r.reason}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: r.status === 'pending' ? 'rgba(245,158,11,0.15)' : r.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: r.status === 'pending' ? 'var(--warning)' : r.status === 'resolved' ? 'var(--success)' : 'var(--danger)'
                      }}>{r.status}</span>
                    </td>
                    <td style={tdStyle}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap:'wrap' }}>
                          <button className="btn btn-success" style={{ padding: '5px 10px', fontSize: 11 }}
                            onClick={() => resolveReport(r.id, 'resolved')}>Шешілді</button>
                          <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 11 }}
                            onClick={() => resolveAndBan(r)}>Бан + Шешілді</button>
                          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }}
                            onClick={() => resolveReport(r.id, 'dismissed')}>Қабылданбады</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <Activity size={20} color="var(--accent)" />
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Аудит (Activity Logs)</h2>
          </div>
          {activityLogs.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>Деректер жоқ</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activityLogs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 140 }}>
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, minWidth: 100 }}>{log.action}</div>
                  <div style={{ flex: 1, fontSize: 13 }}>{log.details}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'broadcast' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <Send size={20} color="var(--success)" />
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Жаппай хабарландыру (Push Notification)</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Кімге жібереміз?</label>
              <select className="input" value={broadcast.target} onChange={e => setBroadcast({...broadcast, target: e.target.value})}>
                <option value="all">Барлығына (All Users)</option>
                <option value="mobilographer">Тек Мобилографтарға</option>
                <option value="client">Тек Клиенттерге</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Тақырыбы (Title)</label>
              <input className="input" value={broadcast.title} onChange={e => setBroadcast({...broadcast, title: e.target.value})} placeholder="ShotBook жаңартуы!" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Мәтіні (Message)</label>
              <textarea className="input" rows={4} value={broadcast.message} onChange={e => setBroadcast({...broadcast, message: e.target.value})} placeholder="Хабарлама мәтіні..." />
            </div>
            <button className="btn btn-primary" onClick={async () => {
              if (!broadcast.title || !broadcast.message) return toast.error('Толық толтырыңыз')
              try {
                await api.post('/admin/broadcast', broadcast)
                toast.success('Хабарлама сәтті жіберілді!')
                setBroadcast({ target: 'all', title: '', message: '' })
              } catch { toast.error('Қате шықты') }
            }}>
              <Send size={16} /> Жіберу
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
