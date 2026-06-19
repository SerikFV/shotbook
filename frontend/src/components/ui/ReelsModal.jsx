import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Volume2, VolumeX, Heart, Share2, Play, MessageCircle, Link as LinkIcon, Check, Bookmark, Send } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

const getRotationFromUrl = (url) => {
  if (!url) return 0
  const match = url.match(/[?&]rot=(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

export default function ReelsModal({ urls, initialIndex, onClose }) {
  const [activeIdx, setActiveIdx] = useState(initialIndex)
  const [isMuted, setIsMuted] = useState(true)
  const [shareData, setShareData] = useState(null)
  const [commentsData, setCommentsData] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleScroll = (e) => {
    const el = e.target
    const index = Math.round(el.scrollTop / el.clientHeight)
    if (index !== activeIdx && index >= 0 && index < urls.length) {
      setActiveIdx(index)
    }
  }

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: initialIndex * window.innerHeight,
        behavior: 'instant'
      })
    }
  }, [initialIndex])

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'black', zIndex: 999999, overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: 24, left: 24, right: 24, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none'
      }}>
        <button onClick={() => setIsMuted(!isMuted)} style={{
          width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'background 0.2s', pointerEvents: 'auto'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button onClick={onClose} style={{
          width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'background 0.2s', pointerEvents: 'auto'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
          <X size={20} />
        </button>
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          width: '100%', height: '100%',
          overflowY: 'scroll', scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none', msOverflowStyle: 'none'
        }}
      >
        <style>{`::-webkit-scrollbar { display: none; }`}</style>
        
        {urls.map((url, i) => (
          <ReelItem 
            key={url + i} 
            url={url} 
            isActive={i === activeIdx} 
            isMuted={isMuted} 
            onShare={(u) => setShareData({ url: u })}
            onComment={(u) => setCommentsData({ url: u })}
          />
        ))}
      </div>

      {shareData && <ShareOverlay url={shareData.url} onClose={() => setShareData(null)} />}
      {commentsData && <CommentsOverlay url={commentsData.url} onClose={() => setCommentsData(null)} />}
    </div>,
    document.body
  )
}

function ReelItem({ url, isActive, isMuted, onShare, onComment }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const { user } = useAuthStore()

  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likes, setLikes] = useState(0)
  const [comments, setComments] = useState(0)
  const [saves, setSaves] = useState(0)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/media/stats?url=${encodeURIComponent(url)}`)
        setLikes(data.likes)
        setComments(data.comments)
        setSaves(data.saves)
        setIsLiked(data.is_liked)
        setIsSaved(data.is_saved)
      } catch (err) {
        console.error(err)
      }
    }
    fetchStats()
  }, [url, isActive]) // re-fetch if it becomes active to get latest counts

  useEffect(() => {
    if (isActive) {
      videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    } else {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        setIsPlaying(false)
      }
    }
  }, [isActive])

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current?.pause()
      setIsPlaying(false)
    }
  }

  const handleLike = async (e) => {
    e.stopPropagation()
    if (!user) return toast.error('Лайк басу үшін жүйеге кіріңіз')
    
    setIsLiked(!isLiked)
    setLikes(l => isLiked ? l - 1 : l + 1)
    try {
      await api.post('/media/toggle-like', { url })
    } catch {
      setIsLiked(isLiked)
      setLikes(l => isLiked ? l + 1 : l - 1)
    }
  }

  const handleSave = async (e) => {
    e.stopPropagation()
    if (!user) return toast.error('Сақтау үшін жүйеге кіріңіз')
    
    setIsSaved(!isSaved)
    setSaves(s => isSaved ? s - 1 : s + 1)
    try {
      await api.post('/media/toggle-save', { url })
    } catch {
      setIsSaved(isSaved)
      setSaves(s => isSaved ? s + 1 : s - 1)
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num
  }

  const rotation = getRotationFromUrl(url)
  const isRotatedLandscape = rotation === 90 || rotation === 270

  return (
    <div style={{
      width: '100%', height: '100vh', scrollSnapAlign: 'start',
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#111'
    }}>
      <div style={{
        width: '100%', height: '100%', maxWidth: '500px',
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <video
          ref={videoRef}
          src={url}
          muted={isMuted}
          loop
          playsInline
          onClick={togglePlay}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer'
          }}
        />
      </div>
      
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: isRotatedLandscape ? '100vh' : '500px',
        pointerEvents: 'none',
        zIndex: 5
      }}>
        {!isPlaying && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            color: 'white'
          }}>
            <Play size={36} fill="white" style={{ marginLeft: 6 }} />
          </div>
        )}

        {/* Оң жақ панель */}
        <div style={{
          position: 'absolute', right: 16, bottom: 80, display: 'flex', flexDirection: 'column', gap: 24,
          pointerEvents: 'auto'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'white' }}>
            <button onClick={handleLike} style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: isLiked ? '#ef4444' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all 0.2s', transform: isLiked ? 'scale(1.1)' : 'scale(1)' }}>
              <Heart size={26} fill={isLiked ? '#ef4444' : 'none'} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{formatNumber(likes)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'white' }}>
            <button onClick={(e) => { e.stopPropagation(); onComment(url) }} style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}>
              <MessageCircle size={26} fill="white" stroke="black" strokeWidth={0.5} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{formatNumber(comments)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'white' }}>
            <button onClick={handleSave} style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: isSaved ? '#eab308' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}>
              <Bookmark size={26} fill={isSaved ? '#eab308' : 'none'} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{formatNumber(saves)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'white' }}>
            <button onClick={(e) => { e.stopPropagation(); onShare(url) }} style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}>
              <Share2 size={26} fill="white" stroke="black" strokeWidth={0.5} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Share</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommentsOverlay({ url, onClose }) {
  const [commentsList, setCommentsList] = useState([])
  const [text, setText] = useState('')
  const { user } = useAuthStore()

  useEffect(() => {
    api.get(`/media/comments?url=${encodeURIComponent(url)}`).then(res => setCommentsList(res.data))
  }, [url])

  const sendComment = async () => {
    if (!text.trim()) return
    if (!user) return toast.error('Пікір жазу үшін жүйеге кіріңіз')

    try {
      const { data } = await api.post('/media/comments', { url, text })
      setCommentsList([data, ...commentsList])
      setText('')
    } catch {
      toast.error('Қате кетті')
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98 }}></div>
      <div className="fade-in" style={{ 
        position: 'absolute', bottom: 0, left: 0, right: 0, background: '#1c1c1e', 
        borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', 
        zIndex: 99, color: 'white', borderTop: '1px solid #333', height: '60vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Пікірлер ({commentsList.length})</h4>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18}/></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8 }}>
          {commentsList.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#333', overflow: 'hidden' }}>
                {c.user.avatar ? <img src={c.user.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" /> : <span style={{display:'flex',height:'100%',alignItems:'center',justifyContent:'center',fontWeight:700}}>{c.user.username[0].toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600, marginBottom: 4 }}>{c.user.username}</div>
                <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.4 }}>{c.text}</div>
              </div>
            </div>
          ))}
          {commentsList.length === 0 && <div style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>Пікірлер жоқ. Бірінші болып пікір қалдырыңыз!</div>}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, borderTop: '1px solid #333', paddingTop: 16 }}>
          <input 
            type="text" 
            value={text} 
            onChange={e => setText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && sendComment()}
            placeholder="Пікір жазу..." 
            style={{ flex: 1, background: '#2c2c2e', border: 'none', borderRadius: 24, padding: '12px 16px', color: 'white', outline: 'none' }} 
          />
          <button onClick={sendComment} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  )
}

function ShareOverlay({ url, onClose }) {
  const [contacts, setContacts] = useState([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/messages/contacts').then(({ data }) => {
      setContacts(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const copyLink = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Сілтеме көшірілді')
  }

  const sendToChat = async (contactId) => {
    try {
      await api.post('/messages', { receiver_id: contactId, message: `Бұл видеоны қарап көр: ${url}` })
      toast.success('Чатқа жіберілді')
      onClose()
    } catch {
      toast.error('Алдымен жүйеге кіріңіз немесе қате кетті')
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98 }}></div>
      <div className="fade-in" style={{ 
        position: 'absolute', bottom: 0, left: 0, right: 0, background: '#1c1c1e', 
        borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px', 
        zIndex: 99, color: 'white', borderTop: '1px solid #333'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Бөлісу</h4>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18}/></button>
        </div>

        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          <div onClick={copyLink} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 64 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {copied ? <Check size={24} color="var(--success)"/> : <LinkIcon size={24} />}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500 }}>Көшіру</span>
          </div>

          {loading ? <div style={{ fontSize: 13, color: '#888', alignSelf: 'center', marginLeft: 16 }}>Чаттар жүктелуде...</div> : 
            contacts.map(c => (
              <div key={c.id} onClick={() => sendToChat(c.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 64 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', border: '2px solid #1c1c1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, overflow: 'hidden' }}>
                  {c.avatar ? <img src={c.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : c.username[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 64, fontWeight: 500 }}>{c.username}</span>
              </div>
            ))
          }
        </div>
      </div>
    </>
  )
}
