import { create } from 'zustand'

import type { DockingContact } from '../types'
import { useTurnTimerStore } from './timerStore'

export type DockMenuExitReason = 'confirmed' | 'dismissed'

interface DockMenuContext {
  shipId: string
  ownerId: string
  contact: DockingContact
  openedAt: number
  resumeOnClose: boolean
}

export interface DockMenuStore {
  isOpen: boolean
  context: DockMenuContext | null
  lastExitReason: DockMenuExitReason | null
  lastClosedAt: number | null
  openDockMenu: (payload: { shipId: string; ownerId: string; contact: DockingContact }) => void
  confirmDocking: () => void
  dismissDockMenu: () => void
}

export const useDockMenuStore = create<DockMenuStore>((set, get) => ({
  isOpen: false,
  context: null,
  lastExitReason: null,
  lastClosedAt: null,
  openDockMenu: ({ shipId, ownerId, contact }) => {
    const timerStore = useTurnTimerStore.getState()
    const wasPaused = timerStore.isPaused

    if (!wasPaused) {
      timerStore.pause()
    }

    set((state) => ({
      isOpen: true,
      context: {
        shipId,
        ownerId,
        contact,
        openedAt: Date.now(),
        resumeOnClose: state.context?.resumeOnClose ?? !wasPaused,
      },
      lastExitReason: null,
      lastClosedAt: state.lastClosedAt,
    }))
  },
  confirmDocking: () => {
    const state = get()
    if (!state.context) {
      return
    }

    if (state.context.resumeOnClose) {
      useTurnTimerStore.getState().resume()
    }

    set({
      isOpen: false,
      context: null,
      lastExitReason: 'confirmed',
      lastClosedAt: Date.now(),
    })
  },
  dismissDockMenu: () => {
    const state = get()
    if (!state.context) {
      return
    }

    if (state.context.resumeOnClose) {
      useTurnTimerStore.getState().resume()
    }

    set({
      isOpen: false,
      context: null,
      lastExitReason: 'dismissed',
      lastClosedAt: Date.now(),
    })
  },
}))

export const selectIsDockMenuOpen = (state: DockMenuStore): boolean => state.isOpen

export const selectDockMenuContext = (state: DockMenuStore): DockMenuContext | null =>
  state.context

export const selectLastDockMenuExit = (
  state: DockMenuStore,
): { reason: DockMenuExitReason | null; closedAt: number | null } => ({
  reason: state.lastExitReason,
  closedAt: state.lastClosedAt,
})
