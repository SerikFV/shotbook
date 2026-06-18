import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, X, Clock, MapPin, User, Phone, Loader2 } from 'lucide-react'
import 'react-calendar/dist/Calendar.css'

export default function CalendarPage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuthStore()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [date, setDate] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [availability, setAvailability] = useState([])
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [slotForm, setSlotForm] = useState({ start_time: '09:00', end_time: '18:00', is_blocked: false })
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    try {
      const [bRes, aRes] = await Promise.all([
        api.get(`/bookings/mobilographer/${user.id}/calendar`),
        api.get(`/availability/${user.id}`)
      ])
      setBookings(bRes.data)
      setAvailability(aRes.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { 
    load()
    if (searchParams.get('google_sync') === 'success') {
      toast.success('Google Calendar сәтті қосылды!')
      refreshUser()
      navigate('/calendar', { replace: true })
    }
    if (searchParams.get('error')) {
      toast.error('Google Calendar қосу кезінде қате кетті немесе бас тартылды.')
      navigate('/calendar', { replace: true })
    }
  }, [user.id, searchParams])

  const dateStr = (d) => d.toISOString().split('T')[0]

  const dateBookings = bookings.filter(b =>
    new Date(b.booking_date).toDateString() === date.toDateString()
  )

  const dateAvailability = availability.filter(a => a.date === dateStr(date))

  const bookedDates = new Set(bookings.map(b => new Date(b.booking_date).toDateString()))
  const availDates = new Set(availability.map(a => new Date(a.date).toDateString()))

  const tileContent = ({ date: d }) => {
    const hasBooking = bookedDates.has(d.toDateString())
    const hasAvail = availDates.has(d.toDateString())
    if (!hasBooking && !hasAvail) return null
    return (
      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 2 }}>
        {hasBooking && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />}
        {hasAvail && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)' }} />}
      </div>
    )
  }

  const addSlot = async () => {
    try {
      await api.post('/availability', { ...slotForm, date: dateStr(date) })
      toast.success(t('cal_slot_added'))
      setShowAddSlot(false)
      load()
    } catch (e) {
      toast.error(e.response?.data?.detail || t('error'))
    }
  }

  const deleteSlot = async (id) => {
    try {
      await api.delete(`/availability/${id}`)
      toast.success(t('deleted'))
      load()
    } catch { toast.error(t('error')) }
  }

  const statusLabel = (s) => {
    const map = { new: 'status_new', confirmed: 'status_confirmed', shooting: 'status_shooting',
      editing: 'status_editing', completed: 'status_completed', cancelled: 'status_cancelled' }
    return t(map[s] || s)
  }

    return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>{t('calendar')}</h1>
          {isLoading && <Loader2 size={20} className="spin" style={{ color: 'var(--text-secondary)' }} />}
        </div>
        {user?.role === 'mobilographer' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user?.profile?.has_google_calendar ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✅ Google Calendar
                </span>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={async () => {
                    try {
                      await api.delete('/google/disconnect');
                      toast.success('Ажыратылды');
                      window.location.reload();
                    } catch { toast.error('Қате кетті'); }
                  }}>Ажырату</button>
              </div>
            ) : (
              <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, background: '#4285F4', borderColor: '#4285F4' }}
                onClick={async () => {
                  try {
                    const { data } = await api.get('/google/auth-url');
                    window.location.href = data.auth_url;
                  } catch { toast.error('Қате кетті'); }
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google Calendar қосу
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Calendar */}
        <div style={{ flex: '0 0 auto', minWidth: 280 }}>
          <Calendar onChange={setDate} value={date} tileContent={tileContent} locale="ru" />
          <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} /> {t('cal_dot_booking')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} /> {t('cal_dot_free')}
            </span>
          </div>
        </div>

        {/* Day detail */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{date.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
              <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}
                onClick={() => setShowAddSlot(!showAddSlot)}>
                <Plus size={14} /> Уақыт қос
              </button>
            </div>

            {/* Add slot form */}
            {showAddSlot && (
              <div style={{ background: 'var(--card2)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="grid-2">
                  <div className="field">
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Басталу</label>
                    <input className="input" type="time" value={slotForm.start_time}
                      onChange={e => setSlotForm({ ...slotForm, start_time: e.target.value })} />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Аяқталу</label>
                    <input className="input" type="time" value={slotForm.end_time}
                      onChange={e => setSlotForm({ ...slotForm, end_time: e.target.value })} />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={slotForm.is_blocked}
                    onChange={e => setSlotForm({ ...slotForm, is_blocked: e.target.checked })} />
                  Бұғатталған (демалыс / жеке уақыт)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1, padding: '8px' }} onClick={addSlot}>Қосу</button>
                  <button className="btn btn-ghost" style={{ flex: 1, padding: '8px' }} onClick={() => setShowAddSlot(false)}>Бас тарту</button>
                </div>
              </div>
            )}

            {/* Availability slots */}
            {dateAvailability.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Белгіленген уақыттар</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dateAvailability.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8,
                      background: a.is_blocked ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      border: `1px solid ${a.is_blocked ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`
                    }}>
                      <span style={{ fontSize: 13, color: a.is_blocked ? 'var(--danger)' : 'var(--success)' }}>
                        <Clock size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        {a.start_time} – {a.end_time} {a.is_blocked ? '🔒 Бұғатталған' : '✅ Бос'}
                      </span>
                      <button onClick={() => deleteSlot(a.id)} style={{ background: 'none', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              Тапсырыстар ({dateBookings.length})
            </div>
            {dateBookings.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                Бүгін тапсырыс жоқ
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dateBookings.map(b => (
                  <div key={b.id}
                    onClick={() => setSelectedBooking(selectedBooking?.id === b.id ? null : b)}
                    style={{ background: 'var(--card2)', borderRadius: 10, padding: '12px 16px', borderLeft: '3px solid var(--accent)', cursor: 'pointer', transition: 'var(--transition)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{b.shoot_type}</span>
                      <span className={`badge badge-${b.status}`}>{statusLabel(b.status)}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>🕐 {b.start_time} – {b.end_time}</div>

                    {/* Expanded card */}
                    {selectedBooking?.id === b.id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {b.client && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <User size={13} color="var(--accent)" />
                            <span style={{ fontWeight: 600 }}>{b.client.username}</span>
                          </div>
                        )}
                        {b.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <MapPin size={13} /> {b.location}
                          </div>
                        )}
                        {b.notes && (
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            "{b.notes}"
                          </div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                          {b.total_price?.toLocaleString()} ₸
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>{t('upcoming_shoots')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookings
            .filter(b => new Date(b.booking_date) >= new Date() && !['cancelled', 'completed'].includes(b.status))
            .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date))
            .slice(0, 10)
            .map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', background: 'var(--card2)', borderRadius: 10 }}>
                <div style={{ background: 'var(--accent-light)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', minWidth: 52 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{new Date(b.booking_date).getDate()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{new Date(b.booking_date).toLocaleDateString('ru', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{b.shoot_type}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{b.start_time}–{b.end_time} · {b.client?.username}</div>
                  {b.location && <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>📍 {b.location}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`badge badge-${b.status}`}>{statusLabel(b.status)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{b.total_price?.toLocaleString()} ₸</span>
                </div>
              </div>
            ))}
          {bookings.filter(b => new Date(b.booking_date) >= new Date() && !['cancelled', 'completed'].includes(b.status)).length === 0 && (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 24, fontSize: 13 }}>{t('no_data')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
