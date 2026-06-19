import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Camera, Save, Upload, X, Image, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import ReelsModal from '../components/ui/ReelsModal'

const VIDEO_EXTS = new Set(['mp4','mov','avi','webm','mkv','flv','wmv','m4v','3gp','ts'])
const isVideo = (url) => VIDEO_EXTS.has((url || '').split('.').pop().split('?')[0].toLowerCase())
const getRotationFromUrl = (url) => {
  if (!url) return 0
  const match = url.match(/[?&]rot=(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}
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
  const [pendingFiles, setPendingFiles] = useState([])
  const [lightbox, setLightbox] = useState({ open: false, urls: [], index: 0 })
  const [reelsModal, setReelsModal] = useState({ open: false, urls: [], index: 0 })
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

  const rotateImage = (file, rotation) => {
    return new Promise((resolve) => {
      if (rotation === 0) {
        resolve(file)
        return
      }
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (rotation % 180 === 90) {
          canvas.width = img.height
          canvas.height = img.width
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }
        
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const rotatedFile = new File([blob], file.name, {
            type: file.type || 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(rotatedFile)
        }, file.type || 'image/jpeg', 0.9)
      }
      img.onerror = () => {
        resolve(file)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const isVideoFile = (file) => {
    if (file.type && file.type.startsWith('video/')) return true
    const ext = (file.name || '').split('.').pop().toLowerCase()
    return VIDEO_EXTS.has(ext)
  }

  const handlePortfolioSelect = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    
    const newPending = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file: file,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
      type: isVideoFile(file) ? 'video' : 'image'
    }))
    
    setPendingFiles(prev => [...prev, ...newPending])
    e.target.value = ''
  }

  const rotatePendingFile = (id, direction) => {
    setPendingFiles(prev => prev.map(item => {
      if (item.id !== id) return item
      let nextRot = item.rotation + (direction === 'right' ? 90 : -90)
      nextRot = (nextRot % 360 + 360) % 360
      return { ...item, rotation: nextRot }
    }))
  }

  const removePendingFile = (id) => {
    setPendingFiles(prev => {
      const target = prev.find(item => item.id === id)
      if (target) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter(item => item.id !== id)
    })
  }

  const startUploadPending = async () => {
    if (!pendingFiles.length) return
    setUploading(true)
    const newUrls = []
    
    for (const item of pendingFiles) {
      try {
        let fileToUpload = item.file
        if (item.type === 'image' && item.rotation !== 0) {
          fileToUpload = await rotateImage(item.file, item.rotation)
        }
        
        const fd = new FormData()
        fd.append('file', fileToUpload)
        const { data } = await api.post('/users/me/portfolio/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        let finalUrl = data.url
        if (item.type === 'video' && item.rotation !== 0) {
          finalUrl = `${data.url}?rot=${item.rotation}`
        }
        newUrls.push(finalUrl)
        
        // AI Vision: analyze uploaded image/video cover
        try {
          const imageUrl = isVideo(data.url) ? data.url.replace(/\.[^/.]+$/, ".jpg") : data.url
          const aiRes = await api.post('/ai/analyze-image', { image_url: imageUrl })
          if (aiRes.data.tags) {
            if (window.confirm(`✨ AI суреттен мыналарды тапты: ${aiRes.data.tags}\nМамандықтар қатарына қосамыз ба?`)) {
              setForm(prev => ({ 
                ...prev, 
                specializations: prev.specializations ? prev.specializations + ', ' + aiRes.data.tags : aiRes.data.tags 
              }))
            }
          }
        } catch (aiErr) { console.log('AI Vision error:', aiErr) }
      } catch (err) {
        toast.error(err.response?.data?.detail || `${item.file.name} жүктелмеді`)
      }
    }
    
    if (newUrls.length) {
      const updatedUrls = [...portfolioUrls, ...newUrls]
      try {
        await api.put('/users/me/profile', {
          ...form,
          portfolio_urls: updatedUrls.join('\n'),
          social_links: JSON.stringify(socialLinks),
        })
        setPortfolioUrls(updatedUrls)
        toast.success(`${newUrls.length} файл жүктелді`)
      } catch (saveErr) {
        console.error('Failed to update portfolio URLs:', saveErr)
        setPortfolioUrls(updatedUrls)
      }
      await refreshUser()
    }
    
    pendingFiles.forEach(item => URL.revokeObjectURL(item.previewUrl))
    setPendingFiles([])
    setUploading(false)
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>{t('bio')}</label>
                  <button type="button" onClick={async () => {
                    try {
                      if (!form.bio.trim()) return toast.error('Мәтін жазыңыз!');
                      const tId = toast.loading('AI жазуда...');
                      const { data } = await api.post('/ai/enhance-text', { text: form.bio });
                      setForm({ ...form, bio: data.enhanced_text });
                      toast.success('Жақсартылды!', { id: tId });
                    } catch { toast.error('Қате шықты'); }
                  }} style={{ background: 'linear-gradient(to right, #8a2be2, #4b0082)', color: 'white', padding: '4px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>✨ AI-мен жақсарту</button>
                </div>
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
                style={{ display: 'none' }} onChange={handlePortfolioSelect} disabled={uploading} />
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
              {portfolioUrls.map((url, i) => {
                const rotation = getRotationFromUrl(url)
                return (
                  <div key={i} style={{
                    position: 'relative', borderRadius: 10, overflow: 'hidden',
                    aspectRatio: '1', background: 'var(--card2)', border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                    onClick={() => {
                      if (isVideo(url)) {
                        const vids = portfolioUrls.filter(u => isVideo(u))
                        setReelsModal({ open: true, urls: vids, index: vids.indexOf(url) })
                      } else {
                        const pics = portfolioUrls.filter(u => !isVideo(u))
                        setLightbox({ open: true, urls: pics, index: pics.indexOf(url) })
                      }
                    }}
                  >
                    {isVideo(url) ? (
                      <div style={{ width: '100%', height: '100%', transform: rotation ? `rotate(${rotation}deg)` : undefined }}>
                        <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          muted playsInline preload="metadata" />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '100%', transform: rotation ? `rotate(${rotation}deg)` : undefined }}>
                        <img src={url} alt={`portfolio-${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.target.src = '' }} />
                      </div>
                    )}
                  {isVideo(url) && (
                    <div style={{
                      position: 'absolute', bottom: 6, left: 6,
                      background: 'rgba(0,0,0,0.6)', borderRadius: 6,
                      padding: '2px 6px', fontSize: 11, color: 'white'
                    }}>▶ Видео</div>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removePortfolioImage(url); }} style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                    width: 24, height: 24, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: 'white'
                  }}>
                    <X size={13} />
                  </button>
                </div>
              )
            })}
              <label style={{
                borderRadius: 10, aspectRatio: '1', border: '2px dashed var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer',
                color: 'var(--text-secondary)', gap: 6, fontSize: 12
              }}>
                <Upload size={20} />
                Қос
                <input type="file" accept={ACCEPT} multiple style={{ display: 'none' }}
                  onChange={handlePortfolioSelect} disabled={uploading} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Файлдарды бұру және жүктеу терезесі (Rotation & Preview Modal) */}
      {pendingFiles.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 13, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: 640,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            background: 'var(--card)',
            borderColor: 'var(--border2)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
            padding: 24,
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Жүктелетін файлдарды реттеу</h3>
              <button 
                onClick={() => {
                  pendingFiles.forEach(item => URL.revokeObjectURL(item.previewUrl))
                  setPendingFiles([])
                }} 
                style={{
                  background: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 16,
              padding: '8px 4px',
              maxHeight: '400px'
            }}>
              {pendingFiles.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--card2)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  padding: 8,
                  position: 'relative'
                }}>
                  <div style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {item.type === 'video' ? (
                      <video 
                        src={item.previewUrl} 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: `rotate(${item.rotation}deg)`,
                          transition: 'transform 0.2s ease-in-out'
                        }}
                        muted
                        playsInline
                      />
                    ) : (
                      <img 
                        src={item.previewUrl} 
                        alt="" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: `rotate(${item.rotation}deg)`,
                          transition: 'transform 0.2s ease-in-out'
                        }}
                      />
                    )}
                    
                    <button 
                      onClick={() => removePendingFile(item.id)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: 'rgba(244, 63, 94, 0.85)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white'
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6, width: '100%', justifyContent: 'space-between' }}>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '6px 10px', flex: 1, justifyContent: 'center' }}
                      onClick={() => rotatePendingFile(item.id, 'left')}
                      title="Солға бұру"
                    >
                      <RotateCcw size={13} />
                    </button>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '6px 10px', flex: 1, justifyContent: 'center' }}
                      onClick={() => rotatePendingFile(item.id, 'right')}
                      title="Оңға бұру"
                    >
                      <RotateCw size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pendingFiles.some(item => item.type === 'video') && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success)',
                borderRadius: 8,
                padding: 10,
                fontSize: 12,
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>✅</span>
                <p style={{ margin: 0, lineHeight: 1.4 }}>
                  Бейнебаянның бұрылысы толығымен сақталады және сайттың барлық бетінде сіз орнатқан күйде көрсетіледі.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button 
                className="btn btn-ghost" 
                style={{ padding: '10px 20px' }}
                onClick={() => {
                  pendingFiles.forEach(item => URL.revokeObjectURL(item.previewUrl))
                  setPendingFiles([])
                }}
                disabled={uploading}
              >
                Бас тарту
              </button>
              <button 
                className="btn btn-primary" 
                style={{ padding: '10px 24px' }}
                onClick={startUploadPending}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <span className="spin">◌</span> Жүктелуде...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Жүктеу
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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

          {(() => {
            const currentUrl = lightbox.urls[lightbox.index]
            const rotation = getRotationFromUrl(currentUrl)
            return (
              <img
                src={currentUrl}
                alt=""
                onClick={e => e.stopPropagation()}
                style={{
                  maxWidth: '90vw', maxHeight: '90vh',
                  objectFit: 'contain', borderRadius: 12,
                  boxShadow: '0 8px 64px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                  transform: rotation ? `rotate(${rotation}deg)` : undefined
                }}
              />
            )
          })()}

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
