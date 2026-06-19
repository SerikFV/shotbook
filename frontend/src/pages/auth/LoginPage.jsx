import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { Camera, Eye, EyeOff } from 'lucide-react'
import './Auth.css'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ login: '', password: '' })
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await login(form.login, form.password)
    if (res.success) {
      if (res.requires_verification) {
        navigate('/verify-email')
      } else {
        toast.success(t('success'))
        navigate('/')
      }
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card fade-in">
        <Link to="/" className="auth-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <img src="/favicon.svg" alt="ShotBook" style={{width:48,height:48,borderRadius:12}} />
          <h1>ShotBook</h1>
        </Link>
        <h2 className="auth-title">{t('login')}</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>{t('email')}</label>
            <input
              className="input"
              type="email"
              placeholder={t('email')}
              value={form.login}
              onChange={e => setForm({...form, login: e.target.value})}
              required
            />
          </div>
          <div className="field">
            <label>{t('password')}</label>
            <div className="input-wrap">
              <input
                className="input"
                type={showPass ? 'text' : 'password'}
                placeholder={t('password')}
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px'}} disabled={isLoading}>
            {isLoading ? <span className="spin">◌</span> : t('login')}
          </button>
        </form>
        <p className="auth-link" style={{marginBottom: 8}}>
          <Link to="/forgot-password" style={{color:'var(--text-secondary)', fontSize:13}}>
            {t('forgot_password')}
          </Link>
        </p>
        <p className="auth-link">
          {t('no_account')} <Link to="/register">{t('register')}</Link>
        </p>
      </div>
    </div>
  )
}
