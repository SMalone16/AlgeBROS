import { create } from 'zustand'
import type { ShipModel } from '../types'

export interface ShipStore {
  ships: Record<string, ShipModel>
  updateShipPosition: (id: string, position: ShipModel['position']) => void
  setShips: (ships: ShipModel[]) => void
}

const normalizeShips = (ships: ShipModel[]): Record<string, ShipModel> =>
  ships.reduce<Record<string, ShipModel>>((accumulator, ship) => {
    accumulator[ship.id] = ship
    return accumulator
  }, {})

export const useShipStore = create<ShipStore>((set) => ({
  ships: {},
  updateShipPosition: (id, position) =>
    set((state) => {
      const existing = state.ships[id]
      /**
       * TODO: Validate movementResolver output before committing updates and
       * trigger animations once the rendering pipeline is ready.
       */
      return {
        ships: {
          ...state.ships,
          [id]: {
            ...(existing ?? { id, ownerId: 'unknown', position }),
            position,
          },
        },
      }
    }),
  setShips: (ships) => set({ ships: normalizeShips(ships) }),
}))

export const selectShipsByOwner = (ownerId: string) => (state: ShipStore): ShipModel[] =>
  Object.values(state.ships).filter((ship) => ship.ownerId === ownerId)
