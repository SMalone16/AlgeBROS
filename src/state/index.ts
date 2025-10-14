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

/**
 * TODO: Introduce combined selectors for territory summaries and scoreboard
 * hydration once the game loop solidifies.
 */
