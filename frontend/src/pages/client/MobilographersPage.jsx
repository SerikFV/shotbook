import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { Search, Star, MapPin, Clock, SlidersHorizontal, X, ChevronDown, Heart } from 'lucide-react'
import './Mobilographers.css'

const SPECIALIZATIONS = [
  'Свадьба', 'Портрет', 'Репортаж', 'Коммерциялық', 'Тұсаукесер', 'Туған күн'
]

const SORT_OPTIONS = [
  { value: '',          labelKk: 'Сорттау',         labelRu: 'Сортировка' },
  { value: 'rating',    labelKk: 'Рейтинг ↓',       labelRu: 'Рейтинг ↓' },
  { value: 'price_asc', labelKk: 'Баға: төменнен',  labelRu: 'Цена: от низкой' },
  { value: 'price_desc',labelKk: 'Баға: жоғарыдан', labelRu: 'Цена: от высокой' },
  { value: 'experience',labelKk: 'Тәжірибе ↓',      labelRu: 'Опыт ↓' },
]

const DEFAULT_FILTERS = {
  search: '',
  minPrice: '',
  maxPrice: '',
  minRating: '',
  minExperience: '',
  specialization: '',
  sortBy: '',
}

export default function MobilographersPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'favorites'
  const [mobilographers, setMobilographers] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [favLoading, setFavLoading] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  // Таңдаулыларды жүктеу
  useEffect(() => {
    if (!user || user.role !== 'client') return
    setFavLoading(true)
    api.get('/favorites/')
      .then(({ data }) => setFavorites(data))
      .catch(() => {})
      .finally(() => setFavLoading(false))
  }, [user?.id, activeTab])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.minPrice)      params.set('min_price', filters.minPrice)
    if (filters.maxPrice)      params.set('max_price', filters.maxPrice)
    if (filters.minRating)     params.set('min_rating', filters.minRating)
    if (filters.minExperience) params.set('min_experience', filters.minExperience)
    if (filters.specialization)params.set('specialization', filters.specialization)
    if (filters.sortBy)        params.set('sort_by', filters.sortBy)

    setLoading(true)
    api.get(`/users/mobilographers?${params.toString()}`)
      .then(({ data }) => setMobilographers(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters.minPrice, filters.maxPrice, filters.minRating, filters.minExperience, filters.specialization, filters.sortBy])

  // Іздеу client-side (жылдам)
  const filtered = useMemo(() =>
    mobilographers.filter(m =>
      m.username.toLowerCase().includes(filters.search.toLowerCase()) ||
      (m.city || '').toLowerCase().includes(filters.search.toLowerCase())
    ), [mobilographers, filters.search])

  const setFilter = (key, val) => setFilters(p => ({ ...p, [key]: val }))

  const clearFilters = () => setFilters(DEFAULT_FILTERS)

  const hasActiveFilters = filters.minPrice || filters.maxPrice || filters.minRating ||
    filters.minExperience || filters.specialization || filters.sortBy

  const lang = i18n.language

  return (
    <div className="mobilographers-page fade-in">
      {/* Header */}
      <div className="page-header">
        <h1>{t('mobilographers')}</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, maxWidth: 600 }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <Search size={16} color="var(--text-secondary)" />
            <input className="search-input"
              placeholder={t('search')}
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
            />
          </div>
          {activeTab === 'all' && (
            <button
              className={`btn ${showFilters || hasActiveFilters ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '8px 14px', fontSize: 13, gap: 6, flexShrink: 0 }}
              onClick={() => setShowFilters(v => !v)}>
              <SlidersHorizontal size={15} />
              {t('filter')}
              {hasActiveFilters && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '0 6px', fontSize: 11 }}>
                {[filters.minPrice, filters.maxPrice, filters.minRating, filters.minExperience, filters.specialization, filters.sortBy].filter(Boolean).length}
              </span>}
            </button>
          )}
        </div>
      </div>

      {/* Табтар */}
      {user?.role === 'client' && (
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
          <button onClick={() => setActiveTab('all')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 20px', fontSize: 14, fontWeight: 500,
            color: activeTab === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'all' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s'
          }}>
            {lang === 'kk' ? 'Барлығы' : 'Все'}
          </button>
          <button onClick={() => setActiveTab('favorites')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 20px', fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
            color: activeTab === 'favorites' ? 'var(--danger)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'favorites' ? '2px solid var(--danger)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s'
          }}>
            <Heart size={14} fill={activeTab === 'favorites' ? 'currentColor' : 'none'} />
            {lang === 'kk' ? 'Таңдаулылар' : 'Избранные'}
          </button>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {/* Баға диапазоны */}
            <div className="field">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                {lang === 'kk' ? 'Баға (₸/сағ)' : 'Цена (₸/час)'}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type="number" placeholder="min"
                  value={filters.minPrice} min={0}
                  onChange={e => setFilter('minPrice', e.target.value)}
                  style={{ padding: '8px 10px' }} />
                <input className="input" type="number" placeholder="max"
                  value={filters.maxPrice} min={0}
                  onChange={e => setFilter('maxPrice', e.target.value)}
                  style={{ padding: '8px 10px' }} />
              </div>
            </div>

            {/* Минималды рейтинг */}
            <div className="field">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                {lang === 'kk' ? 'Рейтинг (мин)' : 'Рейтинг (мин)'}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 3, 4, 4.5].map(r => (
                  <button key={r} type="button"
                    onClick={() => setFilter('minRating', filters.minRating == r ? '' : r)}
                    className={`btn ${filters.minRating == r ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '6px 10px', fontSize: 12, flex: 1 }}>
                    {r === 0 ? t('all') : `${r}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Тәжірибе */}
            <div className="field">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                {lang === 'kk' ? 'Тәжірибе (жыл)' : 'Опыт (лет)'}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 3, 5].map(y => (
                  <button key={y} type="button"
                    onClick={() => setFilter('minExperience', filters.minExperience == y ? '' : y)}
                    className={`btn ${filters.minExperience == y ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '6px 10px', fontSize: 12, flex: 1 }}>
                    {y === 0 ? t('all') : `${y}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Мамандану */}
            <div className="field">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                {lang === 'kk' ? 'Мамандану' : 'Специализация'}
              </label>
              <div style={{ position: 'relative' }}>
                <select className="input"
                  value={filters.specialization}
                  onChange={e => setFilter('specialization', e.target.value)}
                  style={{ appearance: 'none', paddingRight: 32, padding: '8px 12px' }}>
                  <option value="">{t('all')}</option>
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Сорттау */}
            <div className="field">
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                {lang === 'kk' ? 'Сорттау' : 'Сортировка'}
              </label>
              <div style={{ position: 'relative' }}>
                <select className="input"
                  value={filters.sortBy}
                  onChange={e => setFilter('sortBy', e.target.value)}
                  style={{ appearance: 'none', paddingRight: 32, padding: '8px 12px' }}>
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {lang === 'kk' ? o.labelKk : o.labelRu}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button className="btn btn-ghost" style={{ marginTop: 12, fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.3)' }}
              onClick={clearFilters}>
              <X size={13} /> {lang === 'kk' ? 'Фильтрлерді тазалау' : 'Сбросить фильтры'}
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {activeTab === 'all' && !loading && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {lang === 'kk' ? `${filtered.length} мобилограф табылды` : `Найдено ${filtered.length} мобилографов`}
        </div>
      )}

      {/* ── Барлығы Grid ── */}
      {activeTab === 'all' && (
        loading ? (
          <div className="empty-state"><p>{t('loading')}</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>{t('no_data')}</p></div>
        ) : (
          <div className="mob-grid">
            {filtered.map(m => (
              <MobCard key={m.id} m={m} t={t} />
            ))}
          </div>
        )
      )}

      {/* ── Таңдаулылар Grid ── */}
      {activeTab === 'favorites' && (
        favLoading ? (
          <div className="empty-state"><p>{t('loading')}</p></div>
        ) : favorites.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '60px 0' }}>
            <Heart size={48} strokeWidth={1} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              {lang === 'kk' ? 'Таңдаулылар жоқ' : 'Нет избранных'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
              {lang === 'kk' ? 'Мобилограф профилінде ❤️ батырмасын басыңыз' : 'Нажмите ❤️ в профиле мобилографа'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {lang === 'kk' ? `${favorites.length} таңдаулы` : `${favorites.length} избранных`}
            </div>
            <div className="mob-grid">
              {favorites
                .filter(f =>
                  (f.username || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                  (f.city || '').toLowerCase().includes(filters.search.toLowerCase())
                )
                .map(f => (
                  <MobCard key={f.mobilographer_id} m={{
                    id: f.mobilographer_id,
                    username: f.username,
                    avatar: f.avatar,
                    city: f.city,
                    profile: f.profile,
                  }} t={t} />
                ))}
            </div>
          </>
        )
      )}
    </div>
  )
}

// ─── Карточка компоненті ──────────────────────────────────────────────
function MobCard({ m, t }) {
  return (
    <Link to={`/mobilographers/${m.id}`} className="mob-card card">
      <div className="mob-avatar">
        {m.avatar
          ? <img src={m.avatar} alt={m.username} />
          : <span>{(m.username || '?')[0].toUpperCase()}</span>}
      </div>
      <div className="mob-info">
        <h3 className="mob-name">{m.username}</h3>
        {m.city && <div className="mob-city"><MapPin size={12} /> {m.city}</div>}
        {m.profile?.bio && (
          <p className="mob-bio">{m.profile.bio.slice(0, 80)}{m.profile.bio.length > 80 ? '…' : ''}</p>
        )}
        {m.profile?.specializations && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            {m.profile.specializations.split(',').slice(0, 3).map(s => (
              <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-light)', color: 'var(--accent)' }}>
                {s.trim()}
              </span>
            ))}
          </div>
        )}
        <div className="mob-stats">
          <div className="mob-stat">
            <Star size={13} color="#f59e0b" fill={m.profile?.rating ? '#f59e0b' : 'none'} />
            <span>{m.profile?.rating?.toFixed(1) || '–'}</span>
            {m.profile?.total_reviews > 0 && (
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>({m.profile.total_reviews})</span>
            )}
          </div>
          <div className="mob-stat">
            <Clock size={13} />
            <span>{m.profile?.experience || 0} {t('years')}</span>
          </div>
          <div className="mob-price">
            {m.profile?.hourly_price?.toLocaleString() || 0} ₸{t('per_hour')}
          </div>
        </div>
      </div>
      <div className="mob-action">
        <span className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
          {t('view_profile')}
        </span>
      </div>
    </Link>
  )
}
