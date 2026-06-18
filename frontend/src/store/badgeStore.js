import { create } from 'zustand'
import api from '../services/api'

export const useBadgeStore = create((set, get) => ({
  unreadMessages: 0,
  unreadNotifications: 0,
  newBookings: 0,

  fetchAll: async () => {
    try {
      const [msgRes, notifRes] = await Promise.all([
        api.get('/messages/unread-count').catch(() => ({ data: { count: 0 } })),
        api.get('/notifications/').catch(() => ({ data: [] })),
      ])
      set({
        unreadMessages: msgRes.data.count || 0,
        unreadNotifications: (notifRes.data || []).filter(n => !n.is_read).length,
      })
    } catch {}
  },

  setUnreadMessages: (n) => set({ unreadMessages: n }),
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
  incrementMessages: () => set(s => ({ unreadMessages: s.unreadMessages + 1 })),
  clearMessages: () => set({ unreadMessages: 0 }),
  clearNotifications: () => set({ unreadNotifications: 0 }),
}))
