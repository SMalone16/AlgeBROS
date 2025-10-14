import { create } from 'zustand'
import type { ShipModel } from '../types'

export interface ShipStore {
  ships: Record<string, ShipModel>
  shipList: ShipModel[]
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
  shipList: [],
  updateShipPosition: (id, position) =>
    set((state) => {
      const existing = state.ships[id]
      /**
       * TODO: Validate movementResolver output before committing updates and
       * trigger animations once the rendering pipeline is ready.
       */
      const updatedShip = {
        ...(existing ?? { id, ownerId: 'unknown', position }),
        position,
      }
      const ships = {
        ...state.ships,
        [id]: updatedShip,
      }
      return {
        ships,
        shipList: Object.values(ships),
      }
    }),
  setShips: (ships) => set({ ships: normalizeShips(ships), shipList: [...ships] }),
}))

export const selectShipsByOwner = (ownerId: string) => (state: ShipStore): ShipModel[] =>
  Object.values(state.ships).filter((ship) => ship.ownerId === ownerId)

export const selectAllShips = (state: ShipStore): ShipModel[] =>
  state.shipList
