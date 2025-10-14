import { create } from 'zustand'

import {
  resolveMovementSubmission,
  type MovementResult,
  type MovementSubmission,
} from '../game'

interface MovementPreviewDraft extends MovementSubmission {}

export interface MovementPreviewStore {
  draft: MovementPreviewDraft | null
  pendingExpression: string
  result: MovementResult | null
  isEnabled: boolean
  setEnabled: (enabled: boolean) => void
  setDraft: (draft: MovementPreviewDraft | null) => void
  setPendingExpression: (expression: string) => void
  clearPreview: () => void
}

const computeResult = (draft: MovementPreviewDraft | null): MovementResult | null => {
  if (!draft) {
    return null
  }

  return resolveMovementSubmission(draft)
}

export const useMovementPreviewStore = create<MovementPreviewStore>((set, get) => ({
  draft: null,
  pendingExpression: '',
  result: null,
  isEnabled: true,
  setEnabled: (enabled) => set({ isEnabled: enabled }),
  setDraft: (draft) =>
    set({
      draft,
      pendingExpression: draft?.expression ?? '',
      result: computeResult(draft),
    }),
  setPendingExpression: (expression) => {
    const draft = get().draft

    if (!draft) {
      set({ pendingExpression: expression })
      return
    }

    const updatedDraft: MovementPreviewDraft = { ...draft, expression }

    set({
      draft: updatedDraft,
      pendingExpression: expression,
      result: computeResult(updatedDraft),
    })
  },
  clearPreview: () =>
    set({
      draft: null,
      pendingExpression: '',
      result: null,
    }),
}))

export const selectPreviewResult = (state: MovementPreviewStore): MovementResult | null =>
  state.result

export const selectPreviewEnabled = (state: MovementPreviewStore): boolean => state.isEnabled

export const selectPendingExpression = (state: MovementPreviewStore): string =>
  state.pendingExpression
