import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Star, MapPin, Clock, Heart } from 'lucide-react'
import '../client/Mobilographers.css'

export default function FavoritesPage() {
  const { t, i18n } = useTranslation()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const lang = i18n.language

  useEffect(() => {
    api.get('/favorites/')
      .then(({ data }) => setFavorites(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (mobId) => {
    try {
      await api.delete(`/favorites/${mobId}`)
      setFavorites(prev => prev.filter(f => f.mobilographer_id !== mobId))
    } catch {}
  }

  return (
    <div className="mobilographers-page fade-in">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Heart size={22} color="var(--danger)" fill="var(--danger)" />
          {lang === 'kk' ? 'Таңдаулылар' : 'Избранные'}
        </h1>
      </div>

      {loading ? (
        <div className="empty-state"><p>{t('loading')}</p></div>
      ) : favorites.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '80px 0' }}>
          <Heart size={56} strokeWidth={1} style={{ opacity: 0.2, margin: '0 auto 20px', display: 'block' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {lang === 'kk' ? 'Таңдаулылар жоқ' : 'Нет избранных'}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {lang === 'kk'
              ? 'Мобилограф профилінде ❤️ батырмасын басыңыз'
              : 'Нажмите ❤️ в профиле мобилографа'}
          </p>
          <Link to="/mobilographers" className="btn btn-primary"
            style={{ display: 'inline-flex', marginTop: 20, padding: '10px 24px' }}>
            {t('mobilographers')}
          </Link>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {lang === 'kk' ? `${favorites.length} таңдаулы` : `${favorites.length} избранных`}
          </div>
          <div className="mob-grid">
            {favorites.map(f => (
              <div key={f.mobilographer_id} style={{ position: 'relative' }}>
                {/* Таңдаулыдан алу батырмасы */}
                <button
                  onClick={() => handleRemove(f.mobilographer_id)}
                  title={lang === 'kk' ? 'Таңдаулыдан алу' : 'Убрать из избранного'}
                  style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 2,
                    background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)',
                    borderRadius: '50%', width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--danger)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.15)'}
                >
                  <Heart size={14} fill="currentColor" />
                </button>

                <Link to={`/mobilographers/${f.mobilographer_id}`} className="mob-card card">
                  <div className="mob-avatar">
                    {f.avatar
                      ? <img src={f.avatar} alt={f.username} />
                      : <span>{(f.username || '?')[0].toUpperCase()}</span>}
                  </div>
                  <div className="mob-info">
                    <h3 className="mob-name">{f.username}</h3>
                    {f.city && <div className="mob-city"><MapPin size={12} /> {f.city}</div>}
                    {f.profile?.bio && (
                      <p className="mob-bio">{f.profile.bio.slice(0, 80)}{f.profile.bio.length > 80 ? '…' : ''}</p>
                    )}
                    <div className="mob-stats">
                      <div className="mob-stat">
                        <Star size={13} color="#f59e0b" fill={f.profile?.rating ? '#f59e0b' : 'none'} />
                        <span>{f.profile?.rating?.toFixed(1) || '–'}</span>
                      </div>
                      <div className="mob-stat">
                        <Clock size={13} />
                        <span>{f.profile?.experience || 0} {t('years')}</span>
                      </div>
                      <div className="mob-price">
                        {f.profile?.hourly_price?.toLocaleString() || 0} ₸{t('per_hour')}
                      </div>
                    </div>
                  </div>
                  <div className="mob-action">
                    <span className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                      {t('view_profile')}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
