export {
  usePlayerStore,
  selectActivePlayer,
  selectPlayers,
  selectActivePlayerId,
} from './playerStore'
export { useShipStore, selectShipsByOwner, selectAllShips } from './shipStore'
export {
  useTurnTimerStore,
  selectIsTimerExpired,
  selectTimerSnapshot,
  selectSecondsRemaining,
  selectIsTimerPaused,
} from './timerStore'
export {
  useMovementPreviewStore,
  selectPreviewResult,
  selectPreviewEnabled,
  selectPendingExpression,
} from './movementPreviewStore'
export {
  useDockMenuStore,
  selectIsDockMenuOpen,
  selectDockMenuContext,
  selectLastDockMenuExit,
} from './dockMenuStore'

/**
 * TODO: Introduce combined selectors for territory summaries and scoreboard
 * hydration once the game loop solidifies.
 */
