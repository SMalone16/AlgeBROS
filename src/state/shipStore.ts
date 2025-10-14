import { create } from 'zustand'
import type { ShipModel, ShipMotionState, ShipTrailSegment, ShipTurnTrail } from '../types'
import { useTurnTimerStore } from './timerStore'

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
  timestamp?: number
  turnId?: number
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

const cloneTrailHistory = (history: ShipTurnTrail[] = []): ShipTurnTrail[] =>
  history.map((trail) => ({
    turnId: trail.turnId,
    startedAt: trail.startedAt,
    updatedAt: trail.updatedAt,
    segments: trail.segments.map((segment) => ({
      start: { ...segment.start },
      end: { ...segment.end },
      completedAt: segment.completedAt,
    })),
  }))

const clonePolygons = (polygons: ShipModel['territoryPolygons'] = []) =>
  polygons.map((polygon) => ({
    ...polygon,
    vertices: polygon.vertices.map((vertex) => ({ ...vertex })),
  }))

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
  trailHistory: cloneTrailHistory(ship?.trailHistory ?? []),
  territoryPolygons: clonePolygons(ship?.territoryPolygons ?? []),
})

const hydrateShip = (ship: ShipModel): ShipModel => ({
  ...ship,
  localFrameOrigin: ship.localFrameOrigin ?? { ...ship.position },
  accumulatedDistance: ship.accumulatedDistance ?? 0,
  motionState: ship.motionState ?? createDefaultMotionState(),
  trailHistory: cloneTrailHistory(ship.trailHistory ?? []),
  territoryPolygons: clonePolygons(ship.territoryPolygons ?? []),
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
      const timestamp = options?.timestamp ?? Date.now()
      const activeTurnId = options?.turnId ?? useTurnTimerStore.getState().turnId

      if (typeof options?.distanceDelta === 'number') {
        nextAccumulatedDistance += Math.abs(options.distanceDelta)
      }

      if (options?.resetFrame || nextMotionState.status === 'idle') {
        nextFrameOrigin = position
        nextAccumulatedDistance = 0
      }

      let nextTrailHistory = base.trailHistory ?? []
      let currentTrail: ShipTurnTrail | undefined =
        nextTrailHistory[nextTrailHistory.length - 1]

      const shouldResetTrail =
        options?.resetFrame || !currentTrail || currentTrail.turnId !== activeTurnId

      if (shouldResetTrail) {
        currentTrail = {
          turnId: activeTurnId,
          startedAt: timestamp,
          updatedAt: timestamp,
          segments: [],
        }
        if (
          nextTrailHistory[nextTrailHistory.length - 1]?.turnId === activeTurnId
        ) {
          nextTrailHistory = [
            ...nextTrailHistory.slice(0, -1),
            currentTrail,
          ]
        } else {
          nextTrailHistory = [...nextTrailHistory, currentTrail]
        }
      } else if (currentTrail) {
        currentTrail = {
          ...currentTrail,
          segments: [...currentTrail.segments],
          updatedAt: timestamp,
        }
        nextTrailHistory = [
          ...nextTrailHistory.slice(0, -1),
          currentTrail,
        ]
      }

      const hasMoved =
        base.position.x !== position.x || base.position.y !== position.y

      if (hasMoved && currentTrail) {
        const segment: ShipTrailSegment = {
          start: { ...base.position },
          end: { ...position },
          completedAt: timestamp,
        }

        const segments = [...currentTrail.segments, segment]
        currentTrail = {
          ...currentTrail,
          segments,
          updatedAt: timestamp,
        }
        nextTrailHistory = [
          ...nextTrailHistory.slice(0, -1),
          currentTrail,
        ]
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
        trailHistory: nextTrailHistory,
        territoryPolygons: base.territoryPolygons ?? [],
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
