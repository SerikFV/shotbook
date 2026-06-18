import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { createPortal } from 'react-dom'
import { Calendar, MapPin, Clock, Star, X, MessageCircle, Upload, Download, Trash2, FileText } from 'lucide-react'
import { formatDate } from '../utils/date'

const VALID_TRANSITIONS = {
  new:       ['confirmed', 'cancelled'],
  confirmed: ['shooting'],        // расталғаннан кейін бас тарту жоқ
  shooting:  ['editing'],
  editing:   ['completed'],
  completed: [],
  cancelled: [],
}

// Мобилограф батырмалары: статус → батырма конфигурациясы
const MOB_BUTTONS = {
  new: [
    { status: 'confirmed', label: 'Растау',            cls: 'btn-success', icon: '✅' },
    { status: 'cancelled', label: 'Бас тарту',         cls: 'btn-danger',  icon: '✗'  },
  ],
  confirmed: [
    { status: 'shooting',  label: 'Түсірілім басталды', cls: 'btn-primary', icon: '🎬' },
  ],
  shooting: [
    { status: 'editing',   label: 'Монтажда',           cls: 'btn-primary', icon: '✂️' },
  ],
  editing: [
    { status: 'completed', label: 'Аяқталды',           cls: 'btn-success', icon: '✓'  },
  ],
  completed: [],
  cancelled: [],
}

function ReviewModal({ booking, onClose, onDone }) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(5)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/reviews', { booking_id: booking.id, rating, comment })
      toast.success(t('review_sent'))
      onDone(booking.id)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('error'))
    } finally { setSaving(false) }
  }

  return createPortal(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div className="card" style={{width:'100%',maxWidth:420,boxShadow:'0 8px 48px rgba(0,0,0,0.7)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3>{t('leave_review')}</h3>
          <button onClick={onClose} style={{background:'none',color:'var(--text-secondary)',padding:4}}><X size={18}/></button>
        </div>
        <div style={{marginBottom:12,fontSize:13,color:'var(--text-secondary)'}}>
          📸 {booking.mobilographer?.username} · {booking.shoot_type}
        </div>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="field">
            <label>{t('rating')}</label>
            <div style={{display:'flex',gap:6,marginTop:4}}>
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button"
                  onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)} style={{background:'none',padding:2}}>
                  <Star size={28} fill={(hover||rating)>=s?'#f59e0b':'none'} color="#f59e0b" style={{transition:'all 0.15s'}}/>
                </button>
              ))}
              <span style={{alignSelf:'center',fontSize:13,color:'var(--text-secondary)',marginLeft:8}}>{rating}/5</span>
            </div>
          </div>
          <div className="field">
            <label>{t('comment')}</label>
            <textarea className="input" rows={3} placeholder={t('review_placeholder')}
              value={comment} onChange={e => setComment(e.target.value)} style={{resize:'vertical'}}/>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button type="button" className="btn btn-ghost" style={{flex:1}} onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" style={{flex:1}} disabled={saving}>
              {saving ? <span className="spin">◌</span> : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// Feature 5 — Delivery panel
function DeliveryPanel({ booking, isMobilographer }) {
  const { t } = useTranslation()
  const [deliveries, setDeliveries] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    api.get(`/delivery/${booking.id}`).then(({ data }) => setDeliveries(data)).catch(() => {})
  }, [booking.id])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await api.post(`/delivery/${booking.id}/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setDeliveries(prev => [data, ...prev])
        toast.success(`${file.name} жіберілді`)
      } catch (err) { toast.error(err.response?.data?.detail || t('error')) }
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (deliveryId) => {
    try {
      await api.delete(`/delivery/${booking.id}/file/${deliveryId}`)
      setDeliveries(prev => prev.filter(d => d.id !== deliveryId))
      toast.success('Жойылды')
    } catch { toast.error(t('error')) }
  }

  const isImg = (url) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
  const isVideo = (url) => /\.(mp4|mov|avi|webm|mkv)$/i.test(url)

  return (
    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--border)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <span style={{fontWeight:600,fontSize:13}}>📦 Жұмыс нәтижелері ({deliveries.length})</span>
        {isMobilographer && (
          <label className="btn btn-ghost" style={{padding:'5px 12px',fontSize:12,cursor:'pointer'}}>
            {uploading ? <span className="spin">◌</span> : <><Upload size={13}/> Файл жібер</>}
            <input ref={fileRef} type="file" multiple style={{display:'none'}} onChange={handleUpload} disabled={uploading}/>
          </label>
        )}
      </div>
      {deliveries.length === 0 ? (
        <div style={{fontSize:12,color:'var(--text-secondary)',padding:'8px 0'}}>
          {isMobilographer ? 'Клиентке жіберетін файлдарды жүктеңіз' : 'Мобилограф әлі файл жібермеген'}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {deliveries.map(d => (
            <div key={d.id} style={{display:'flex',alignItems:'center',gap:10,background:'var(--card2)',borderRadius:8,padding:'8px 12px'}}>
              {isImg(d.file_url) ? (
                <img src={d.file_url} alt="" style={{width:40,height:40,borderRadius:6,objectFit:'cover',flexShrink:0}}/>
              ) : isVideo(d.file_url) ? (
                <div style={{width:40,height:40,borderRadius:6,background:'var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>▶</div>
              ) : (
                <div style={{width:40,height:40,borderRadius:6,background:'var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><FileText size={18} color="var(--text-secondary)"/></div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.file_name}</div>
                <div style={{fontSize:11,color:'var(--text-secondary)'}}>{new Date(d.uploaded_at).toLocaleDateString()}</div>
              </div>
              <a href={d.file_url} download={d.file_name} className="btn btn-ghost"
                style={{padding:'5px 8px',fontSize:11}}>
                <Download size={13}/>
              </a>
              {isMobilographer && (
                <button className="btn btn-danger" style={{padding:'5px 8px',fontSize:11}}
                  onClick={() => handleDelete(d.id)}>
                  <Trash2 size={13}/>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BookingsPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [reviewBooking, setReviewBooking] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const load = async () => {
    try {
      const { data } = await api.get('/bookings/my')
      setBookings(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/bookings/${id}/status`, { status })
      setBookings(prev => prev.map(b => b.id === id ? { ...data, has_review: b.has_review } : b))
      toast.success(t('success'))
    } catch (e) {
      toast.error(e.response?.data?.detail || t('error'))
    }
  }

  const handleReviewDone = (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, has_review: true } : b))
  }

  const statusLabel = (s) => {
    const map = { new:'status_new', confirmed:'status_confirmed', shooting:'status_shooting',
      editing:'status_editing', completed:'status_completed', cancelled:'status_cancelled' }
    return t(map[s] || s)
  }

  const filters = ['all', 'new', 'confirmed', 'shooting', 'editing', 'completed', 'cancelled']
  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  return (
    <div className="fade-in" style={{display:'flex',flexDirection:'column',gap:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
        <h1 style={{fontSize:24,fontWeight:700}}>{t('bookings')}</h1>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn ${filter===f?'btn-primary':'btn-ghost'}`}
              style={{padding:'6px 14px',fontSize:12}}>
              {f==='all'?t('all'):statusLabel(f)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="empty-state">{t('loading')}</div> :
       filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><Calendar size={40} strokeWidth={1} color="var(--text-secondary)"/><p>{t('no_data')}</p></div></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {filtered.map(b => {
            const currentStatus = b.status?.value || b.status
            const canReview = user.role==='client' && currentStatus==='completed' && !b.has_review
            const showDelivery = ['editing','completed'].includes(currentStatus)
            const isExpanded = expandedId === b.id

            return (
              <div key={b.id} className="card" style={{display:'flex',flexDirection:'column',gap:0}}>
                {/* Main row */}
                <div
                  role="button"
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  style={{ cursor: 'pointer', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span className={`badge badge-${currentStatus}`}>{statusLabel(currentStatus)}</span>
                      <span style={{fontWeight:700,fontSize:15}}>{b.shoot_type}</span>
                    </div>
                    <div style={{display:'flex',gap:16,flexWrap:'wrap',color:'var(--text-secondary)',fontSize:13}}>
                      <span style={{display:'flex',alignItems:'center',gap:4}}><Calendar size={13}/>{formatDate(b.booking_date)}</span>
                      <span style={{display:'flex',alignItems:'center',gap:4}}><Clock size={13}/>{b.start_time}–{b.end_time}</span>
                      {b.location && <span style={{display:'flex',alignItems:'center',gap:4}}><MapPin size={13}/>{b.location}</span>}
                    </div>
                    {b.notes && <p style={{marginTop:8,color:'var(--text-secondary)',fontSize:13}}>{b.notes}</p>}
                    <div style={{marginTop:8,fontSize:13,color:'var(--text-secondary)'}}>
                      {user.role==='mobilographer' ? <span>👤 {b.client?.username}</span> : <span>📸 {b.mobilographer?.username}</span>}
                    </div>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
                    <div style={{fontFamily:'Syne',fontWeight:700,fontSize:18,color:'var(--accent)'}}>{b.total_price?.toLocaleString()} ₸</div>

                    {/* Feature 2 — Тапсырыс чаты */}
                    <button className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}}
                      onClick={e => { e.stopPropagation(); navigate(`/messages/${user.role==='mobilographer'?b.client_id:b.mobilographer_id}`) }}>
                      <MessageCircle size={13}/> Чат
                    </button>

                    {/* Мобилограф батырмалары */}
                    {user.role === 'mobilographer' && (MOB_BUTTONS[currentStatus] || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                        {(MOB_BUTTONS[currentStatus] || []).map(btn => (
                          <button key={btn.status}
                            className={`btn ${btn.cls}`}
                            style={{ padding: '7px 14px', fontSize: 13, gap: 6 }}
                            onClick={() => updateStatus(b.id, btn.status)}>
                            <span>{btn.icon}</span> {btn.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Клиент тек new статусында бас тарта алады */}
                    {user.role === 'client' && currentStatus === 'new' && (
                      <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={e => { e.stopPropagation(); updateStatus(b.id, 'cancelled') }}>
                        ✗ Бас тарту
                      </button>
                    )}

                    {canReview && (
                      <button className="btn btn-ghost"
                        style={{padding:'6px 14px',fontSize:12,borderColor:'rgba(245,158,11,0.4)',color:'#f59e0b'}}
                        onClick={e => { e.stopPropagation(); setReviewBooking(b) }}>
                        <Star size={13} fill="#f59e0b" color="#f59e0b"/>{t('leave_review')}
                      </button>
                    )}

                    {b.has_review && currentStatus==='completed' && (
                      <span style={{fontSize:12,color:'var(--success)',display:'flex',alignItems:'center',gap:4}}>✓ {t('reviewed')}</span>
                    )}
                  </div>
                </div>

                {/* Feature 5 — Delivery panel (expanded) */}
                {isExpanded && showDelivery && (
                  <DeliveryPanel booking={b} isMobilographer={user.role==='mobilographer'}/>
                )}
              </div>
            )
          })}
        </div>
      )}

      {reviewBooking && (
        <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onDone={handleReviewDone}/>
      )}
    </div>
  )
}
