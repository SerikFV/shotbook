import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import {
  Star, MapPin, Clock, MessageCircle, Calendar, AlertTriangle,
  X, Heart, Package, CheckCircle, Instagram, Send, Youtube,
  ExternalLink, Quote
} from 'lucide-react'
import { DatePicker, TimePicker } from '../../components/ui/DateTimePicker'
import ReactCalendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import ReelsModal from '../../components/ui/ReelsModal'
const SHOOT_TYPES = ['Свадьба / Үйлену тойы', 'Портрет', 'Репортаж', 'Коммерциялық', 'Тұсаукесер', 'Туған күн', 'Басқа']
const VIDEO_EXTS = new Set(['mp4','mov','avi','webm','mkv','flv','wmv','m4v','3gp','ts'])
const isVid = (url) => VIDEO_EXTS.has((url || '').split('?')[0].split('.').pop().toLowerCase())

// Әлеуметтік желі конфигурациясы
const SOCIAL_CONFIG = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    bg: 'rgba(225,48,108,0.15)',
    border: 'rgba(225,48,108,0.4)',
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )
  },
  whatsapp: {
    label: 'WhatsApp',
    color: '#25D366',
    bg: 'rgba(37,211,102,0.15)',
    border: 'rgba(37,211,102,0.4)',
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    )
  },
  telegram: {
    label: 'Telegram',
    color: '#0088cc',
    bg: 'rgba(0,136,204,0.15)',
    border: 'rgba(0,136,204,0.4)',
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    )
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    bg: 'rgba(255,0,0,0.15)',
    border: 'rgba(255,0,0,0.4)',
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  },
  tiktok: {
    label: 'TikTok',
    color: '#ffffff',
    bg: 'rgba(255,255,255,0.1)',
    border: 'rgba(255,255,255,0.3)',
    icon: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    )
  }
}

function SocialButton({ type, url }) {
  const cfg = SOCIAL_CONFIG[type]
  if (!cfg || !url) return null

  const href = url.startsWith('http') ? url :
    type === 'whatsapp' ? `https://wa.me/${url.replace(/\D/g,'')}` :
    type === 'telegram' ? `https://t.me/${url.replace('@','')}` :
    `https://${type}.com/${url.replace('@','')}`

  const Icon = cfg.icon
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 10, textDecoration: 'none',
        background: cfg.bg, border: `1.5px solid ${cfg.border}`,
        color: cfg.color, fontWeight: 600, fontSize: 14,
        transition: 'all 0.2s', width: '100%', justifyContent: 'center'
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
    >
      <Icon />{cfg.label}
    </a>
  )
}

export default function MobilographerProfile() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [mob, setMob] = useState(null)
  const [activeTab, setActiveTab] = useState('portfolio')
  const [portfolioFilter, setPortfolioFilter] = useState('all')
  const [lightbox, setLightbox] = useState({ open: false, urls: [], index: 0 })
  const [reelsModal, setReelsModal] = useState({ open: false, urls: [], index: 0 })
  const [existingBookings, setExistingBookings] = useState([]) // мобилографтың брондары
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!lightbox.open) return
    const handler = (e) => {
      if (e.key === 'Escape') setLightbox(p => ({ ...p, open: false }))
      if (e.key === 'ArrowRight') setLightbox(p => ({ ...p, index: (p.index + 1) % p.urls.length }))
      if (e.key === 'ArrowLeft') setLightbox(p => ({ ...p, index: (p.index - 1 + p.urls.length) % p.urls.length }))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox.open, lightbox.urls.length])
  const [showBooking, setShowBooking] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reviews, setReviews] = useState([])
  const [isFav, setIsFav] = useState(false)
  const [availability, setAvailability] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [form, setForm] = useState({
    booking_date: '', start_time: '10:00', end_time: '12:00',
    location: '', shoot_type: SHOOT_TYPES[0], notes: ''
  })

  useEffect(() => {
    api.get(`/users/${id}`).then(({ data }) => {
      setMob(data)
      try {
        const pkgs = JSON.parse(data.profile?.packages || '[]')
        if (pkgs.length) setSelectedPackage(pkgs[0])
      } catch {}
    })
    api.get(`/reviews/${id}`).then(({ data }) => setReviews(data)).catch(() => {})
    api.get(`/availability/${id}`).then(({ data }) => setAvailability(data)).catch(() => {})
    // Мобилографтың бронды тапсырыстарын жүктеу (уақыт конфликтін тексеру үшін)
    api.get(`/bookings/mobilographer/${id}/calendar`).then(({ data }) => setExistingBookings(data)).catch(() => {})
    if (user?.role === 'client') {
      api.get(`/favorites/check/${id}`).then(({ data }) => setIsFav(data.favorited)).catch(() => {})
    }
  }, [id, user])

  const calcPrice = useMemo(() => {
    if (selectedPackage) return { price: selectedPackage.price, label: `${selectedPackage.name} пакеті` }
    if (!mob?.profile?.hourly_price || !form.start_time || !form.end_time) return null
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins <= 0) return null
    const hours = mins / 60
    const price = hours * mob.profile.hourly_price
    return { price, label: `${hours.toFixed(1)} сағ × ${mob.profile.hourly_price.toLocaleString()}₸` }
  }, [form.start_time, form.end_time, mob, selectedPackage])

  const timeConflict = useMemo(() => {
    if (!form.booking_date || !form.start_time || !form.end_time || selectedPackage) return null
    const [sh, sm] = form.start_time.split(':').map(Number)
    const [eh, em] = form.end_time.split(':').map(Number)
    const startMins = sh * 60 + sm, endMins = eh * 60 + em
    if (endMins <= startMins) return null

    // 1. Availability бұғатталған слоттармен тексеру
    const blockedConflict = availability.find(a => {
      if (!a.is_blocked || a.date !== form.booking_date) return false
      const [ash, asm] = a.start_time.split(':').map(Number)
      const [aeh, aem] = a.end_time.split(':').map(Number)
      return startMins < (aeh * 60 + aem) && endMins > (ash * 60 + asm)
    })
    if (blockedConflict) {
      return `Мобилограф ${blockedConflict.start_time}–${blockedConflict.end_time} аралығында демалыста`
    }

    // 2. Бронды тапсырыстармен тексеру (2 брон бір уақытқа кетпесін)
    const bookingConflict = existingBookings.find(b => {
      if (!b.booking_date || b.status === 'cancelled') return false
      const bDate = new Date(b.booking_date).toISOString().split('T')[0]
      if (bDate !== form.booking_date) return false
      const [bsh, bsm] = b.start_time.split(':').map(Number)
      const [beh, bem] = b.end_time.split(':').map(Number)
      return startMins < (beh * 60 + bem) && endMins > (bsh * 60 + bsm)
    })
    if (bookingConflict) {
      return `Мобилограф ${bookingConflict.start_time}–${bookingConflict.end_time} аралығында басқа бронда`
    }

    return null
  }, [form.booking_date, form.start_time, form.end_time, availability, existingBookings, selectedPackage])

  const blockedDates = useMemo(() => {
    const s = new Set()
    // Availability-де бұғатталған күндер
    availability.filter(a => a.is_blocked).forEach(a => s.add(a.date))
    return s
  }, [availability])

  // Таңдалған күнде уақыт слоттары (TimePicker үшін)
  const blockedSlotsForDate = useMemo(() => {
    if (!form.booking_date) return []
    const avBlocked = availability.filter(a => a.is_blocked && a.date === form.booking_date)
    const bookingSlots = existingBookings
      .filter(b => {
        if (b.status === 'cancelled') return false
        const bDate = new Date(b.booking_date).toISOString().split('T')[0]
        return bDate === form.booking_date
      })
      .map(b => ({ start_time: b.start_time, end_time: b.end_time }))
    return [...avBlocked, ...bookingSlots]
  }, [form.booking_date, availability, existingBookings])

  const isDateBlocked = (d) => blockedDates.has(d)

  const toggleFav = async () => {
    try {
      if (isFav) { await api.delete(`/favorites/${id}`); setIsFav(false); toast.success(t('favorite_removed')) }
      else { await api.post(`/favorites/${id}`); setIsFav(true); toast.success(t('favorite_saved')) }
    } catch { toast.error(t('error')) }
  }

  const handleBook = async (e) => {
    e.preventDefault()
    if (isDateBlocked(form.booking_date)) { toast.error(t('date_blocked')); return }
    if (timeConflict) { toast.error(timeConflict); return }
    try {
      await api.post('/bookings/', {
        mobilographer_id: parseInt(id),
        booking_date: new Date(form.booking_date).toISOString(),
        start_time: form.start_time, end_time: form.end_time,
        location: form.location,
        shoot_type: selectedPackage ? `${form.shoot_type} (${selectedPackage.name})` : form.shoot_type,
        notes: form.notes,
      })
      toast.success(t('success')); setShowBooking(false); navigate('/bookings')
    } catch (err) { toast.error(err.response?.data?.detail || t('error')) }
  }

  const handleReport = async (e) => {
    e.preventDefault()
    try {
      await api.post('/reports', { target_user_id: parseInt(id), reason: reportReason })
      toast.success(t('report_sent')); setShowReport(false); setReportReason('')
    } catch { toast.error(t('error')) }
  }

  if (!mob) return <div className="empty-state">{t('loading')}</div>

  const packages = (() => { try { return JSON.parse(mob.profile?.packages || '[]') } catch { return [] } })()
  const socialLinks = (() => { try { return JSON.parse(mob.profile?.social_links || '{}') } catch { return {} } })()
  const getRotationFromUrl = (url) => {
    if (!url) return 0
    const match = url.match(/[?&]rot=(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  const portfolioUrls = (mob.profile?.portfolio_urls || '').split('\n').map(u => u.trim()).filter(Boolean)
  const videoUrls = portfolioUrls.filter(u => isVid(u))
  const photoUrls = portfolioUrls.filter(u => !isVid(u))
  const filteredPortfolio = portfolioFilter === 'video' ? videoUrls : portfolioFilter === 'photo' ? photoUrls : portfolioUrls

  const TABS = [
    { key: 'portfolio', label: t('tab_portfolio') },
    { key: 'bio', label: t('bio') },
    { key: 'calendar', label: t('tab_calendar') },
    { key: 'reviews', label: `${t('tab_reviews')} (${reviews.length})` },
  ]

  return (
    <div className="fade-in" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

      {/* ═══ SIDEBAR ═══ */}
      <div style={{
        width: 280, flexShrink: 0,
        background: 'var(--card)', borderRadius: 16,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
        border: '1px solid var(--border)',
        position: 'sticky', top: 24,
      }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--accent-light)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 32, fontWeight: 700,
            color: 'var(--accent)', overflow: 'hidden', flexShrink: 0,
            border: '3px solid var(--accent)'
          }}>
            {mob.avatar
              ? <img src={mob.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : mob.username[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.2 }}>{mob.username}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 3 }}>{t('mobilographer')}</div>
          </div>
        </div>

        {/* Рейтинг + статистика */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {mob.profile?.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{mob.profile.rating.toFixed(1)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({mob.profile.total_reviews || 0})</span>
            </div>
          )}
          {mob.city && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
              <MapPin size={13} />{mob.city}
            </div>
          )}
          {mob.profile?.experience > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
              <Clock size={13} />{mob.profile.experience} {t('experience_years')}
            </div>
          )}        </div>

        {/* Қол жетімді белгісі */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
          <span style={{ color: 'var(--success)', fontWeight: 500 }}>{t('available')}</span>
        </div>

        {/* Баға */}
        {mob.profile?.hourly_price > 0 && !packages.length && (
          <div style={{
            background: 'var(--accent-light)', borderRadius: 12,
            padding: '14px 16px', textAlign: 'center'
          }}>
            <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--accent)', fontFamily: 'Syne' }}>
              {mob.profile.hourly_price.toLocaleString()} ₸
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{t('per_hour')}</div>
          </div>
        )}

        {/* Әлеуметтік желілер */}
        {Object.keys(socialLinks).filter(k => socialLinks[k]).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(socialLinks).map(([key, val]) =>
              val ? <SocialButton key={key} type={key} url={val} /> : null
            )}
          </div>
        )}

        {/* Іс-әрекет батырмалары */}
        {user && user.id !== mob.id && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {user.role === 'client' && (
              <button className="btn btn-primary" onClick={() => setShowBooking(true)}
                style={{ width: '100%', padding: '13px 16px', fontSize: 15, justifyContent: 'center', borderRadius: 12 }}>
                <Calendar size={16} /> {t('send_booking')}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => navigate(`/messages/${mob.id}`)}
              style={{ width: '100%', padding: '12px 16px', fontSize: 14, justifyContent: 'center', borderRadius: 12 }}>
              <MessageCircle size={16} /> {t('send_message_btn')}
            </button>
            {user.role === 'client' && (
              <button className="btn btn-ghost" onClick={toggleFav}
                style={{
                  width: '100%', padding: '12px 16px', fontSize: 14, justifyContent: 'center', borderRadius: 12,
                  color: isFav ? 'var(--danger)' : 'var(--text-secondary)',
                  borderColor: isFav ? 'rgba(244,63,94,0.4)' : undefined
                }}>
                <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                {isFav ? t('favorite_added') : t('favorite_add')}
              </button>
            )}
            <button className="btn btn-ghost"
              style={{ width: '100%', padding: '11px 16px', fontSize: 13, justifyContent: 'center', borderRadius: 12, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.25)' }}
              onClick={() => setShowReport(true)}>
              <AlertTriangle size={14} /> {t('report')}
            </button>
          </div>
        )}
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Tabs header */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          borderBottom: '1px solid var(--border)', paddingBottom: 0
        }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: 14, fontWeight: 500,
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s', borderRadius: '8px 8px 0 0',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Портфолио таб ── */}
        {activeTab === 'portfolio' && (
          <div>
            {portfolioUrls.length > 0 ? (
              <>
                {/* Фильтр */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {[
                    { key: 'all', label: t('all') },
                    ...(photoUrls.length ? [{ key: 'photo', label: 'Фото' }] : []),
                    ...(videoUrls.length ? [{ key: 'video', label: 'Видео' }] : []),
                  ].map(f => (
                    <button key={f.key} onClick={() => setPortfolioFilter(f.key)}
                      style={{
                        padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                        border: portfolioFilter === f.key ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                        background: portfolioFilter === f.key ? 'var(--accent-light)' : 'var(--card2)',
                        color: portfolioFilter === f.key ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: portfolioFilter === f.key ? 600 : 400,
                        transition: 'all 0.15s'
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 12
                }}>
                  {filteredPortfolio.map((url, i) => (
                    <div key={i} style={{
                      position: 'relative', borderRadius: 12, overflow: 'hidden',
                      aspectRatio: '1', background: 'var(--card2)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                      onClick={() => {
                        if (isVid(url)) {
                          const vids = filteredPortfolio.filter(u => isVid(u))
                          setReelsModal({ open: true, urls: vids, index: vids.indexOf(url) })
                        } else {
                          const pics = filteredPortfolio.filter(u => !isVid(u))
                          setLightbox({ open: true, urls: pics, index: pics.indexOf(url) })
                        }
                      }}
                    >
                      {(() => {
                        const rotation = getRotationFromUrl(url)
                        const transformStyle = rotation ? `rotate(${rotation}deg)` : undefined
                        return isVid(url) ? (
                          <div style={{ width: '100%', height: '100%', transform: transformStyle }}>
                            <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" />
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: '100%', transform: transformStyle }}>
                            <img src={url} alt={`portfolio-${i + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { e.target.style.display = 'none' }} />
                          </div>
                        )
                      })()}
                      {isVid(url) && (
                        <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.65)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'white' }}>▶ Видео</div>
                      )}
                      {!isVid(url) && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'rgba(0,0,0,0)', transition: 'background 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ opacity: 0, transition: 'opacity 0.2s' }}
                            ref={el => { if (el) el.parentElement.onmouseenter = () => el.style.opacity = 1; if (el) el.parentElement.onmouseleave = () => el.style.opacity = 0 }}>
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                <p>Портфолио жоқ</p>
              </div>
            )}
          </div>
        )}

        {/* ── Биография таб ── */}
        {activeTab === 'bio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Өзі жайлы */}
            {mob.profile?.bio ? (
              <div className="card" style={{ padding: '20px 24px' }}>
                <h4 style={{ marginBottom: 12, fontWeight: 700, fontSize: 16 }}>
                  {t('bio')}
                </h4>
                <p style={{ lineHeight: 1.8, color: 'var(--text)', fontSize: 14 }}>{mob.profile.bio}</p>
              </div>
            ) : null}

            {/* Жұмыс тәжірибесі */}
            {mob.profile?.experience > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <h4 style={{ marginBottom: 14, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color="var(--accent)" />
                  {t('experience')}
                </h4>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: 'var(--card2)', borderRadius: 12, padding: '16px 20px',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--accent-light)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 18, color: 'var(--accent)', fontFamily: 'Syne', flexShrink: 0
                  }}>
                    {mob.profile.experience}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    жыл бойы мобилография саласында жұмыс жасайды
                  </div>
                </div>
              </div>
            )}

            {/* Мамандану */}
            {mob.profile?.specializations && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <h4 style={{ marginBottom: 12, fontWeight: 700, fontSize: 16 }}>
                  {t('shoot_type')}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {mob.profile.specializations.split(',').map((s, i) => (
                    <span key={i} style={{
                      padding: '6px 16px', borderRadius: 20, fontSize: 13,
                      background: 'var(--accent-light)', color: 'var(--accent)',
                      border: '1px solid rgba(99,102,241,0.3)', fontWeight: 500
                    }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Баға пакеттері */}
            {packages.length > 0 && (
              <div className="card" style={{ padding: '20px 24px' }}>
                <h4 style={{ marginBottom: 16, fontWeight: 700, fontSize: 16 }}>
                  {t('package_title')}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                  {packages.map((pkg, i) => (
                    <div key={i} onClick={() => setSelectedPackage(selectedPackage?.name === pkg.name ? null : pkg)}
                      style={{
                        borderRadius: 12, padding: '16px', cursor: 'pointer', transition: 'all 0.2s',
                        border: `2px solid ${selectedPackage?.name === pkg.name ? 'var(--accent)' : 'var(--border)'}`,
                        background: selectedPackage?.name === pkg.name ? 'var(--accent-light)' : 'var(--card2)',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{pkg.name}</span>
                        {selectedPackage?.name === pkg.name && <CheckCircle size={15} color="var(--accent)" />}
                      </div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--accent)', marginBottom: 4 }}>
                        {pkg.price?.toLocaleString()} ₸
                      </div>
                      {pkg.duration && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>⏱ {pkg.duration} {t('package_hours')}</div>}
                      {pkg.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{pkg.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!mob.profile?.bio && !mob.profile?.experience && !mob.profile?.specializations && packages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                <p>Мәлімет толтырылмаған</p>
              </div>
            )}
          </div>
        )}

        {/* ── Күнтізбе таб ── */}
        {activeTab === 'calendar' && (
          <div className="card" style={{ padding: '20px 24px' }}>
            <h4 style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('tab_calendar')}
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
              <div style={{ width: '100%', maxWidth: 400 }}>
                <ReactCalendar 
                  onChange={setSelectedDate} 
                  value={selectedDate} 
                  locale="ru"
                  tileContent={({ date: d }) => {
                    const dStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
                    const hasBooking = existingBookings.some(b => b.status !== 'cancelled' && new Date(b.booking_date).toISOString().split('T')[0] === dStr)
                    const hasBlocked = availability.some(a => a.is_blocked && a.date === dStr)
                    if (!hasBooking && !hasBlocked) return null
                    return (
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 2 }}>
                        {hasBooking && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} title="Тапсырыс бар" />}
                        {hasBlocked && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--danger)' }} title="Бұғатталған уақыт" />}
                      </div>
                    )
                  }}
                />
                <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', justifyContent: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} /> Тапсырыс бар
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} /> Бұғатталған (демалыс)
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', background: 'var(--card2)', padding: 16, borderRadius: 12 }}>
                <h5 style={{ marginBottom: 12, fontSize: 14 }}>
                  {selectedDate.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })} — Бос емес уақыттар
                </h5>
                
                {(() => {
                  const dStr = selectedDate.getFullYear() + '-' + String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + String(selectedDate.getDate()).padStart(2, '0')
                  const dayBookings = existingBookings.filter(b => b.status !== 'cancelled' && new Date(b.booking_date).toISOString().split('T')[0] === dStr)
                  const dayBlocked = availability.filter(a => a.is_blocked && a.date === dStr)
                  
                  if (dayBookings.length === 0 && dayBlocked.length === 0) {
                    return <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>Бұл күн толықтай бос! Уақыт таңдап тапсырыс бере аласыз.</div>
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dayBlocked.map(a => (
                        <div key={`blocked-${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--danger)' }}>
                          <Clock size={14} /> {a.start_time} – {a.end_time} (Демалыс)
                        </div>
                      ))}
                      {dayBookings.map(b => (
                        <div key={`booking-${b.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--accent)' }}>
                          <Clock size={14} /> {b.start_time} – {b.end_time} (Басқа тапсырыс)
                        </div>
                      ))}
                    </div>
                  )
                })()}
                
                <button className="btn btn-primary" style={{ marginTop: 16, width: '100%', padding: '10px' }} 
                  onClick={() => {
                    const localDateStr = selectedDate.getFullYear() + '-' + String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + String(selectedDate.getDate()).padStart(2, '0')
                    setForm({ ...form, booking_date: localDateStr })
                    setShowBooking(true)
                  }}>
                  Осы күнге тапсырыс беру
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Пікірлер таб ── */}
        {activeTab === 'reviews' && (
          reviews.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {reviews.map(r => (
                <div key={r.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', overflow: 'hidden' }}>
                  <Quote size={100} color="var(--border)" style={{ position: 'absolute', top: -15, right: -15, opacity: 0.3, transform: 'rotate(10deg)' }} />
                  
                  {r.comment ? (
                    <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic', zIndex: 1, flex: 1 }}>
                      "{r.comment}"
                    </p>
                  ) : (
                    <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', zIndex: 1, flex: 1 }}>
                      Пікір мәтіні жоқ...
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)', zIndex: 1 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(79, 142, 247, 0.4)'
                    }}>{(r.client || '?')[0].toUpperCase()}</div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{r.client}</div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: 20, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginLeft: 6 }}>{r.rating}.0</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-secondary)', background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
              <Star size={40} color="var(--text-secondary)" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
              <p style={{ fontSize: 15, fontWeight: 500 }}>{t('no_reviews_yet')}</p>
            </div>
          )
        )}
      </div>

      {/* ═══ BOOKING MODAL ═══ */}
      {showBooking && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 99999, overflowY: 'auto' }}>
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
            <div className="card" style={{ width: '100%', maxWidth: 520, boxShadow: '0 8px 48px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3>{t('create_booking')}</h3>
                <button onClick={() => setShowBooking(false)} style={{ background: 'none', color: 'var(--text-secondary)', padding: 4 }}><X size={18} /></button>
              </div>
              <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>{t('booking_date')}</label>
                  <DatePicker value={form.booking_date} onChange={v => setForm({ ...form, booking_date: v })}
                    minDate={new Date().toISOString().split('T')[0]} blockedDates={blockedDates} placeholder={t('booking_date')} />
                  {form.booking_date && isDateBlocked(form.booking_date) && (
                    <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>⚠️ {t('date_blocked')}</span>
                  )}
                </div>
                {!selectedPackage && (
                  <>
                    <div className="grid-2">
                      <div className="field">
                        <label>{t('start_time')}</label>
                        <TimePicker value={form.start_time} onChange={v => setForm({ ...form, start_time: v })}
                          blockedSlots={blockedSlotsForDate} hasError={!!timeConflict} />
                      </div>
                      <div className="field">
                        <label>{t('end_time')}</label>
                        <TimePicker value={form.end_time} onChange={v => setForm({ ...form, end_time: v })}
                          blockedSlots={blockedSlotsForDate} hasError={!!timeConflict} />
                      </div>
                    </div>
                    {timeConflict && (
                      <div style={{ background: 'rgba(244,63,94,0.12)', border: '1.5px solid var(--danger)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🔴 {timeConflict}. Басқа уақыт таңдаңыз.
                      </div>
                    )}
                  </>
                )}
                {selectedPackage && (
                  <div style={{ background: 'var(--accent-light)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={14} /> <strong>{selectedPackage.name}</strong> — {selectedPackage.duration} сағат, {selectedPackage.price?.toLocaleString()} ₸
                  </div>
                )}
                {calcPrice && (
                  <div style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{calcPrice.label}</span>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{calcPrice.price.toLocaleString()} ₸</span>
                  </div>
                )}
                <div className="field">
                  <label>{t('location')}</label>
                  <input className="input" placeholder="Алматы, Абай даңғылы" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required />
                </div>
                <div className="field">
                  <label>{t('shoot_type')}</label>
                  <select className="input" value={form.shoot_type} onChange={e => setForm({ ...form, shoot_type: e.target.value })}>
                    {SHOOT_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{t('notes')}</label>
                  <textarea className="input" rows={3} placeholder={t('notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowBooking(false)}>{t('cancel')}</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}
                    disabled={(form.booking_date && isDateBlocked(form.booking_date)) || !!timeConflict}>
                    {timeConflict ? t('time_busy_btn') : t('submit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ REPORT MODAL ═══ */}
      {showReport && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, boxShadow: '0 8px 48px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>{t('report')}</h3>
              <button onClick={() => setShowReport(false)} style={{ background: 'none', color: 'var(--text-secondary)', padding: 4 }}><X size={18} /></button>
            </div>
            <form onSubmit={handleReport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>{t('report_reason')}</label>
                <textarea className="input" rows={4} required placeholder={t('report_placeholder')}
                  value={reportReason} onChange={e => setReportReason(e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReport(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>Жіберу</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ═══ REELS MODAL ═══ */}
      {reelsModal.open && (
        <ReelsModal 
          urls={reelsModal.urls} 
          initialIndex={reelsModal.index} 
          onClose={() => setReelsModal(p => ({ ...p, open: false }))} 
        />
      )}

      {/* ═══ LIGHTBOX ═══ */}
      {lightbox.open && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)',
            zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setLightbox(p => ({ ...p, open: false }))}
        >
          {/* X батырмасы */}
          <button
            onClick={() => setLightbox(p => ({ ...p, open: false }))}
            style={{
              position: 'fixed', top: 20, right: 20, zIndex: 1000000,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <X size={20} />
          </button>

          {/* Алдыңғы батырма */}
          {lightbox.urls.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(p => ({ ...p, index: (p.index - 1 + p.urls.length) % p.urls.length })) }}
              style={{
                position: 'fixed', left: 20, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
                color: 'white', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(8px)',
              }}>‹</button>
          )}

          {/* Сурет */}
          <img
            src={lightbox.urls[lightbox.index]}
            alt=""
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 12,
              boxShadow: '0 8px 64px rgba(0,0,0,0.8)',
              userSelect: 'none',
            }}
          />

          {/* Келесі батырма */}
          {lightbox.urls.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(p => ({ ...p, index: (p.index + 1) % p.urls.length })) }}
              style={{
                position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)',
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
                color: 'white', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(8px)',
              }}>›</button>
          )}

          {/* Санауыш */}
          {lightbox.urls.length > 1 && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 13,
              padding: '6px 16px', borderRadius: 20, backdropFilter: 'blur(8px)',
            }}>
              {lightbox.index + 1} / {lightbox.urls.length}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
