import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { Mail, RefreshCw, LogOut, CheckCircle } from 'lucide-react'
import './Auth.css'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, setVerified } = useAuthStore()

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputsRef = useRef([])

  const userId = user?.id || location.state?.user_id

  // Countdown таймері
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // Пайдаланушы жоқ болса login-ге бағыттау
  useEffect(() => {
    if (!userId) navigate('/login')
  }, [userId])

  const handleInput = (index, value) => {
    // Тек сан қабылдайды
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError('')

    // Келесі ұяшыққа өту
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }

    // Барлық ұяшық толған кезде авто-верификация
    if (newCode.every(c => c !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      inputsRef.current[5]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (codeStr) => {
    const finalCode = codeStr || code.join('')
    if (finalCode.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/verify-email', {
        user_id: userId,
        code: finalCode,
      })
      setSuccess(true)
      setVerified(data.user, data.access_token)
      toast.success('Email расталды!')
      setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      const detail = err.response?.data?.detail || 'error'
      if (detail === 'invalid_code') setError('Код қате. Қайта тексеріңіз.')
      else if (detail === 'code_expired') setError('Кодтың мерзімі өтті. Жаңа код сұраңыз.')
      else setError('Қате орын алды')
      setCode(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setResending(true)
    try {
      await api.post('/auth/resend-code', { user_id: userId, purpose: 'register' })
      setCountdown(60)
      setCode(['', '', '', '', '', ''])
      setError('')
      toast.success('Жаңа код жіберілді')
      inputsRef.current[0]?.focus()
    } catch {
      toast.error('Қате орын алды')
    } finally { setResending(false) }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card fade-in" style={{ maxWidth: 420 }}>
        {/* Лого */}
        <Link to="/" className="auth-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img src="/favicon.svg" alt="ShotBook" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <h1>ShotBook</h1>
        </Link>

        {success ? (
          /* Сәтті растауда */
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(16,185,129,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <CheckCircle size={32} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Email расталды!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Сайтқа кіріп жатырсыз...</p>
          </div>
        ) : (
          <>
            {/* Icon + Title */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--accent-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <Mail size={24} color="var(--accent)" />
              </div>
              <h2 className="auth-title" style={{ marginBottom: 8 }}>Email растаңыз</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text)' }}>{user?.email}</strong> адресіне<br />
                6 таңбалы код жіберілді
              </p>
            </div>

            {/* Код енгізу */}
            <div
              style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}
              onPaste={handlePaste}
            >
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputsRef.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleInput(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 48, height: 56,
                    textAlign: 'center', fontSize: 22, fontWeight: 700,
                    fontFamily: 'monospace',
                    background: 'var(--card2)',
                    border: `2px solid ${error ? 'var(--danger)' : digit ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 12, color: 'var(--text)',
                    outline: 'none', transition: 'border-color 0.15s',
                    caretColor: 'var(--accent)',
                  }}
                  onFocus={e => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--accent)'}
                />
              ))}
            </div>

            {/* Қате хабары */}
            {error && (
              <p style={{
                color: 'var(--danger)', fontSize: 13, textAlign: 'center',
                marginBottom: 16, padding: '8px 12px',
                background: 'rgba(244,63,94,0.08)', borderRadius: 8,
                border: '1px solid rgba(244,63,94,0.2)'
              }}>
                {error}
              </p>
            )}

            {/* Растау батырмасы */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', marginBottom: 16 }}
              onClick={() => handleVerify()}
              disabled={loading || code.join('').length !== 6}
            >
              {loading ? <span className="spin">◌</span> : 'Растау'}
            </button>

            {/* Қайта жіберу */}
            <button
              className="btn btn-ghost"
              style={{
                width: '100%', justifyContent: 'center', padding: '11px',
                marginBottom: 12,
                opacity: countdown > 0 ? 0.5 : 1,
                cursor: countdown > 0 ? 'not-allowed' : 'pointer'
              }}
              onClick={handleResend}
              disabled={countdown > 0 || resending}
            >
              <RefreshCw size={15} className={resending ? 'spin' : ''} />
              {countdown > 0
                ? `Қайта жіберу (${countdown}с)`
                : resending ? 'Жіберілуде...' : 'Кодты қайта жіберу'}
            </button>

            {/* Басқа аккаунтпен кіру */}
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', color: 'var(--text-secondary)', fontSize: 13 }}
              onClick={handleLogout}
            >
              <LogOut size={14} /> Басқа аккаунтпен кіру
            </button>
          </>
        )}
      </div>
    </div>
  )
}
