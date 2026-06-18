import { create } from 'zustand'
import api from '../services/api'

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isLoading: false,

  login: async (login, password) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/login', { login, password })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, token: data.access_token, isLoading: false })
      return {
        success: true,
        requires_verification: data.requires_verification || false,
        user_id: data.user.id,
      }
    } catch (e) {
      set({ isLoading: false })
      return { success: false, error: e.response?.data?.detail || 'Error' }
    }
  },

  register: async (formData) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post('/auth/register', formData)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, token: data.access_token, isLoading: false })
      return {
        success: true,
        requires_verification: data.requires_verification || false,
        user_id: data.user.id,
      }
    } catch (e) {
      set({ isLoading: false })
      return { success: false, error: e.response?.data?.detail || 'Error' }
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get('/auth/me')
      localStorage.setItem('user', JSON.stringify(data))
      set({ user: data })
    } catch {}
  },

  // Верификация сәтті болғанда user жаңарту
  setVerified: (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    set({ user: userData, token })
  },
}))
