import React, { useState, useEffect } from 'react'
import { Sparkles, Loader, Trash2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

export default function AiIdeasPage() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [ideas, setIdeas] = useState('')
  
  // Local storage арқылы тарихты сақтау
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ai_ideas_history') || '[]')
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('ai_ideas_history', JSON.stringify(history))
  }, [history])

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return toast.error('Тақырып жазыңыз')
    setLoading(true)
    setIdeas('')
    try {
      const { data } = await api.post('/ai/generate-ideas', { topic })
      setIdeas(data.ideas)
      
      // Тарихқа қосу (ең жаңасы үстінде)
      setHistory(prev => [
        { topic: topic.trim(), ideas: data.ideas, date: new Date().toISOString() },
        ...prev
      ])
    } catch (err) {
      toast.error('Қате шықты')
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    if (window.confirm('Тарихты толықтай өшіргіңіз келе ме?')) {
      setHistory([])
      localStorage.removeItem('ai_ideas_history')
      toast.success('Тарих тазартылды')
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles color="#8a2be2" />
          AI Идеялар генераторы
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Келесі Reels немесе TikTok үшін қандай идея керек екенін жазыңыз, AI сізге дайын сценарий жазып береді.</p>
      </div>

      <div className="card">
        <form onSubmit={handleGenerate} style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1 }}
            placeholder="Мысалы: 'Автокөлік салонын жарнамалау үшін динамикалық видео'"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader className="spin" size={18} /> : 'Генерация'}
          </button>
        </form>
      </div>

      {ideas && (
        <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)' }}>
          <h3 style={{ marginBottom: 16, color: 'var(--accent)' }}>Жаңа нәтиже:</h3>
          <ReactMarkdown>{ideas}</ReactMarkdown>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Генерация тарихы ({history.length})</h3>
            <button className="btn btn-ghost" onClick={clearHistory} style={{ color: 'var(--danger)' }}>
              <Trash2 size={16} /> Тазарту
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {history.map((h, i) => (
              <div key={i} className="card" style={{ background: 'var(--card2)', border: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: 8 }}>Тұспал: <span style={{ color: 'var(--text)' }}>{h.topic}</span></h4>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {new Date(h.date).toLocaleString()}
                </div>
                <div style={{ fontSize: 15, opacity: 0.9 }}>
                  <ReactMarkdown>{h.ideas}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
