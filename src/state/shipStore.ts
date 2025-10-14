import { create } from 'zustand'
import type { ShipModel, ShipMotionState } from '../types'

export interface ShipStore {
  ships: Record<string, ShipModel>
  shipList: ShipModel[]
  updateShipPosition: (
    id: string,
    position: ShipModel['position'],
    options?: ShipPositionUpdateOptions,
  ) => void
  setShips: (ships: ShipModel[]) => void
}

export interface ShipPositionUpdateOptions {
  ownerId?: string
  frameOrigin?: { x: number; y: number }
  distanceDelta?: number
  resetFrame?: boolean
  motionState?: Partial<ShipMotionState>
}

const createDefaultMotionState = (): ShipMotionState => ({
  status: 'idle',
  destination: null,
  speed: 0,
  startedAt: null,
  eta: null,
  distanceRemaining: 0,
  totalDistance: 0,
})

const ensureShipModel = (
  ship: ShipModel | undefined,
  fallback: { id: string; ownerId: string; position: { x: number; y: number } },
): ShipModel => ({
  id: fallback.id,
  ownerId: ship?.ownerId ?? fallback.ownerId,
  position: ship?.position ?? fallback.position,
  localFrameOrigin: ship?.localFrameOrigin ?? fallback.position,
  accumulatedDistance: ship?.accumulatedDistance ?? 0,
  motionState: ship?.motionState ?? createDefaultMotionState(),
})

const hydrateShip = (ship: ShipModel): ShipModel => ({
  ...ship,
  localFrameOrigin: ship.localFrameOrigin ?? { ...ship.position },
  accumulatedDistance: ship.accumulatedDistance ?? 0,
  motionState: ship.motionState ?? createDefaultMotionState(),
})

const normalizeShips = (ships: ShipModel[]): Record<string, ShipModel> =>
  ships.reduce<Record<string, ShipModel>>((accumulator, ship) => {
    const hydrated = hydrateShip(ship)
    accumulator[hydrated.id] = hydrated
    return accumulator
  }, {})

export const useShipStore = create<ShipStore>((set) => ({
  ships: {},
  shipList: [],
  updateShipPosition: (id, position, options) =>
    set((state) => {
      const existing = state.ships[id]
      const ownerId = options?.ownerId ?? existing?.ownerId ?? 'unknown'
      const base = ensureShipModel(existing, { id, ownerId, position })

      const nextMotionState: ShipMotionState = {
        ...createDefaultMotionState(),
        ...base.motionState,
        ...(options?.motionState ?? {}),
      }

      let nextFrameOrigin = options?.frameOrigin ?? base.localFrameOrigin
      let nextAccumulatedDistance = base.accumulatedDistance

      if (typeof options?.distanceDelta === 'number') {
        nextAccumulatedDistance += Math.abs(options.distanceDelta)
      }

      if (options?.resetFrame || nextMotionState.status === 'idle') {
        nextFrameOrigin = position
        nextAccumulatedDistance = 0
      }
      /**
       * TODO: Validate movementResolver output before committing updates and
       * trigger animations once the rendering pipeline is ready.
       */
      const updatedShip: ShipModel = {
        ...base,
        position,
        ownerId,
        localFrameOrigin: nextFrameOrigin,
        accumulatedDistance: nextAccumulatedDistance,
        motionState: nextMotionState,
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
  setShips: (ships) => {
    const hydratedShips = ships.map(hydrateShip)
    set({ ships: normalizeShips(hydratedShips), shipList: [...hydratedShips] })
  },
}))

export const selectShipsByOwner = (ownerId: string) => (state: ShipStore): ShipModel[] =>
  Object.values(state.ships).filter((ship) => ship.ownerId === ownerId)

export const selectAllShips = (state: ShipStore): ShipModel[] =>
  state.shipList
