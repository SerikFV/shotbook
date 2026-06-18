import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Bookmark, Share2, ArrowLeft, Calendar } from 'lucide-react'
import api from '../services/api'
import './ExplorePage.css'

function ReelPlayer({ reel, isActive }) {
  const videoRef = useRef(null)
  const navigate = useNavigate()
  
  const [stats, setStats] = useState({ likes: 0, saves: 0, is_liked: false, is_saved: false })
  
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(e => console.log('Autoplay blocked', e))
    } else if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isActive])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/media/stats?url=${encodeURIComponent(reel.url)}`)
        setStats(data)
      } catch (e) {}
    }
    fetchStats()
  }, [reel.url])

  const togglePlay = () => {
    if (videoRef.current.paused) videoRef.current.play()
    else videoRef.current.pause()
  }

  const handleLike = async (e) => {
    e.stopPropagation()
    try {
      const { data } = await api.post('/media/toggle-like', { url: reel.url })
      setStats(prev => ({ ...prev, is_liked: data.status === 'liked', likes: prev.likes + (data.status === 'liked' ? 1 : -1) }))
    } catch (e) { alert('Лайк басу үшін жүйеге кіріңіз!') }
  }

  const handleSave = async (e) => {
    e.stopPropagation()
    try {
      const { data } = await api.post('/media/toggle-save', { url: reel.url })
      setStats(prev => ({ ...prev, is_saved: data.status === 'saved', saves: prev.saves + (data.status === 'saved' ? 1 : -1) }))
    } catch (e) { alert('Сақтау үшін жүйеге кіріңіз!') }
  }

  return (
    <div className="reel-container">
      <video 
        ref={videoRef}
        className="reel-video-player"
        src={reel.url}
        loop
        playsInline
        muted={false}
        onClick={togglePlay}
      />
      
      <div className="reel-ui">
        <div className="reel-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="reel-bottom">
          <div className="reel-info">
            <div className="reel-author-name" onClick={() => navigate(`/mobilographers/${reel.author.id}`)}>
              {reel.author.username}
            </div>
            <p className="reel-desc">{reel.description}</p>
            <button className="book-btn" onClick={() => navigate(`/mobilographers/${reel.author.id}?book=true`)}>
              <Calendar size={18} /> Брондау
            </button>
          </div>

          <div className="reel-actions">
            <div className="reel-avatar" onClick={() => navigate(`/mobilographers/${reel.author.id}`)}>
              {reel.author.avatar ? <img src={reel.author.avatar} alt=""/> : reel.author.username[0].toUpperCase()}
            </div>
            
            <button className="action-btn" onClick={handleLike}>
              <div className="icon-bg">
                <Heart size={24} fill={stats.is_liked ? '#ef4444' : 'none'} color={stats.is_liked ? '#ef4444' : 'white'} />
              </div>
              <span>{stats.likes}</span>
            </button>
            
            <button className="action-btn" onClick={() => alert('Пікірлер үшін ReelsModal-дағыдай бөлім қосылады')}>
              <div className="icon-bg">
                <MessageCircle size={24} color="white" />
              </div>
              <span>Пікір</span>
            </button>
            
            <button className="action-btn" onClick={handleSave}>
              <div className="icon-bg">
                <Bookmark size={24} fill={stats.is_saved ? '#eab308' : 'none'} color={stats.is_saved ? '#eab308' : 'white'} />
              </div>
              <span>Сақтау</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const { data } = await api.get('/media/explore')
        setReels(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchReels()
  }, [])

  const handleScroll = (e) => {
    const container = e.target
    const index = Math.round(container.scrollTop / window.innerHeight)
    if (index !== activeIndex) {
      setActiveIndex(index)
    }
  }

  if (loading) return <div className="explore-loading">Жүктелуде...</div>
  if (!reels.length) return <div className="explore-loading">Видеолар табылмады</div>

  return (
    <div className="explore-page" onScroll={handleScroll}>
      {reels.map((reel, index) => (
        <ReelPlayer key={`${reel.url}-${index}`} reel={reel} isActive={index === activeIndex} />
      ))}
    </div>
  )
}
