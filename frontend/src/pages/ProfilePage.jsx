import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Camera, Save, Upload, X, Image } from 'lucide-react'

const VIDEO_EXTS = new Set(['mp4','mov','avi','webm','mkv','flv','wmv','m4v','3gp','ts'])
const isVideo = (url) => VIDEO_EXTS.has((url || '').split('.').pop().split('?')[0].toLowerCase())
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/avi,video/x-msvideo,video/x-matroska,video/x-ms-wmv,video/m4v,.mp4,.mov,.avi,.webm,.mkv,.flv,.wmv,.m4v,.3gp,.ts"

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuthStore()

  const [form, setForm] = useState({
    city: '', phone: '', bio: '', experience: 0,
    hourly_price: 0, specializations: ''
  })
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [portfolioUrls, setPortfolioUrls] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Әлеуметтік желілер
  const [socialLinks, setSocialLinks] = useState({
    instagram: '', whatsapp: '', telegram: '', youtube: '', tiktok: ''
  })

  useEffect(() => {
    if (user) {
      const urls = (user.profile?.portfolio_urls || '').split('\n').map(u => u.trim()).filter(Boolean)
      setPortfolioUrls(urls)
      setForm({
        city: user.city || '',
        phone: user.phone || '',
        bio: user.profile?.bio || '',
        experience: user.profile?.experience || 0,
        hourly_price: user.profile?.hourly_price || 0,
        specializations: user.profile?.specializations || '',
      })
      try {
        const sl = JSON.parse(user.profile?.social_links || '{}')
        setSocialLinks({
          instagram: sl.instagram || '',
          whatsapp: sl.whatsapp || '',
          telegram: sl.telegram || '',
          youtube: sl.youtube || '',
          tiktok: sl.tiktok || '',
        })
      } catch {
        setSocialLinks({ instagram: '', whatsapp: '', telegram: '', youtube: '', tiktok: '' })
      }
    }
  }, [user?.profile?.portfolio_urls, user?.city, user?.phone, user?.username, user?.email])

  const handleSave = async (e) => {
    e?.preventDefault()
    setSaving(true)
    try {
      await api.put('/users/me/profile', {
        ...form,
        portfolio_urls: portfolioUrls.join('\n'),
        social_links: JSON.stringify(socialLinks),
      })
      await refreshUser()
      toast.success(t('success'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('error'))
    } finally { setSaving(false) }
  }

  const handleAvatar = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await refreshUser()
      toast.success(t('success'))
    } catch { toast.error(t('error')) }
    finally { setAvatarUploading(false) }
  }

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    const newUrls = []
    for (const file of files) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await api.post('/users/me/portfolio/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        newUrls.push(data.url)
      } catch (err) {
        toast.error(err.response?.data?.detail || `${file.name} жүктелмеді`)
      }
    }
    if (newUrls.length) {
      setPortfolioUrls(prev => [...prev, ...newUrls])
      toast.success(`${newUrls.length} файл жүктелді`)
    }
    setUploading(false)
    e.target.value = ''
  }

  const removePortfolioImage = async (url) => {
    try {
      await api.delete(`/users/me/portfolio/image?url=${encodeURIComponent(url)}`)
      setPortfolioUrls(prev => prev.filter(u => u !== url))
      toast.success(t('deleted'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('error'))
    }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>{t('profile')}</h1>

      {/* Аватар карточкасы */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'var(--accent-light)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 32, fontWeight: 700,
            color: 'var(--accent)', overflow: 'hidden', border: '3px solid var(--accent)'
          }}>
            {user?.avatar
              ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : user?.username?.[0]?.toUpperCase()}
          </div>
          <label style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 28, height: 28, background: 'var(--accent)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            {avatarUploading
              ? <span className="spin" style={{ color: 'white', fontSize: 12 }}>◌</span>
              : <Camera size={14} color="white" />}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
          </label>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.username}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, textTransform: 'capitalize' }}>{user?.role}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user?.email}</div>
        </div>
      </div>

      {/* Профиль деректері — қала, телефон + мобилограф үшін биография */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>{t('edit_profile')}</h3>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            <div className="field">
              <label>{t('city')}</label>
              <input className="input" value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Алматы" />
            </div>
            <div className="field">
              <label>{t('phone')}</label>
              <input className="input" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+7 777 000 00 00" />
            </div>
          </div>

          {user?.role === 'mobilographer' && (
            <>
              <div className="field">
                <label>{t('bio')}</label>
                <textarea className="input" rows={4} value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  placeholder={t('bio')} style={{ resize: 'vertical' }} />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>{t('experience')}</label>
                  <input className="input" type="number" min={0} max={50} value={form.experience}
                    onChange={e => setForm({ ...form, experience: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label>{t('hourly_price')}</label>
                  <input className="input" type="number" min={0} value={form.hourly_price}
                    onChange={e => setForm({ ...form, hourly_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="field">
                <label>{t('shoot_type')}</label>
                <input className="input" value={form.specializations}
                  onChange={e => setForm({ ...form, specializations: e.target.value })}
                  placeholder="Свадьба, Портрет, Репортаж..." />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary"
            style={{ alignSelf: 'flex-start', padding: '11px 28px' }} disabled={saving}>
            {saving ? <span className="spin">◌</span> : <><Save size={16} /> {t('save')}</>}
          </button>
        </form>
      </div>

      {/* Әлеуметтік желілер — тек мобилограф */}
      {user?.role === 'mobilographer' && (
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>{t('social_links')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'instagram', label: 'Instagram', placeholder: '@username немесе толық URL', color: '#E1306C' },
              { key: 'whatsapp', label: 'WhatsApp', placeholder: '+7 777 000 00 00', color: '#25D366' },
              { key: 'telegram', label: 'Telegram', placeholder: '@username', color: '#0088cc' },
              { key: 'youtube', label: 'YouTube', placeholder: 'Канал URL немесе @handle', color: '#FF0000' },
              { key: 'tiktok', label: 'TikTok', placeholder: '@username', color: '#ffffff' },
            ].map(({ key, label, placeholder, color }) => (
              <div key={key} className="field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {label}
                </label>
                <input
                  className="input"
                  placeholder={placeholder}
                  value={socialLinks[key]}
                  onChange={e => setSocialLinks(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-primary"
            style={{ alignSelf: 'flex-start', padding: '10px 24px', marginTop: 16 }}
            onClick={handleSave} disabled={saving}>
            {saving ? <span className="spin">◌</span> : <><Save size={15} /> {t('save')}</>}
          </button>
        </div>
      )}

      {/* Портфолио — тек мобилограф */}
      {user?.role === 'mobilographer' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>{t('portfolio')}</h3>
            <label className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
              {uploading
                ? <><span className="spin">◌</span> Жүктелуде...</>
                : <><Upload size={15} /> Файл қос</>}
              <input ref={fileInputRef} type="file" accept={ACCEPT} multiple
                style={{ display: 'none' }} onChange={handlePortfolioUpload} disabled={uploading} />
            </label>
          </div>

          {portfolioUrls.length === 0 ? (
            <div style={{
              border: '2px dashed var(--border)', borderRadius: 12,
              padding: '40px 24px', textAlign: 'center',
              color: 'var(--text-secondary)', cursor: 'pointer'
            }} onClick={() => fileInputRef.current?.click()}>
              <Image size={40} strokeWidth={1} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14 }}>Суреттер мен видеоларды осында сүйреңіз немесе басыңыз</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>JPG, PNG, WEBP, GIF, MP4, MOV, AVI, WEBM, MKV...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {portfolioUrls.map((url, i) => (
                <div key={i} style={{
                  position: 'relative', borderRadius: 10, overflow: 'hidden',
                  aspectRatio: '1', background: 'var(--card2)', border: '1px solid var(--border)'
                }}>
                  {isVideo(url) ? (
                    <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      muted playsInline preload="metadata" />
                  ) : (
                    <img src={url} alt={`portfolio-${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.src = '' }} />
                  )}
                  {isVideo(url) && (
                    <div style={{
                      position: 'absolute', bottom: 6, left: 6,
                      background: 'rgba(0,0,0,0.6)', borderRadius: 6,
                      padding: '2px 6px', fontSize: 11, color: 'white'
                    }}>▶ Видео</div>
                  )}
                  <button onClick={() => removePortfolioImage(url)} style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                    width: 24, height: 24, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: 'white'
                  }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
              <label style={{
                borderRadius: 10, aspectRatio: '1', border: '2px dashed var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
                color: 'var(--text-secondary)', gap: 6, fontSize: 12
              }}>
                <Upload size={20} />
                Қос
                <input type="file" accept={ACCEPT} multiple style={{ display: 'none' }}
                  onChange={handlePortfolioUpload} disabled={uploading} />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
