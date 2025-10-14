import { all, create } from 'mathjs'
import type { MathJsInstance } from 'mathjs'

const math = create(all!, {}) as MathJsInstance

export const evaluateExpression = (expression: string): number => {
  /**
   * TODO: Enforce player-specific constraints (operators, difficulty tiers,
   * etc.) before evaluating expressions. For now we defer to mathjs for quick
   * validation to unblock UI prototyping.
   */
  return math.evaluate(expression) as number
}

export const generateEquationForTerritory = (seed: string): string => {
  /**
   * TODO: Produce deterministic-yet-varied algebraic challenges per territory
   * by leveraging seed-based randomization once balancing rules are finalized.
   */
  return `${seed} = ?`
}
