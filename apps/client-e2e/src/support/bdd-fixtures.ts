/**
 * @fileoverview Custom Playwright-BDD test fixtures and World context for ShiftSync.
 * Sets up per-scenario context, fast localStorage session injection, and post-scenario cleanup hooks.
 */

import { test as base, createBdd } from 'playwright-bdd';
import { ScenarioStateManager, getApiClientForPersona } from './api-fixtures';
import { getPersona, Persona } from './personas';

/**
 * Shared scenario execution context accessible across all step definitions.
 */
export interface WorldContext {
  /** Tracker for created shifts, swaps, and snapshots to ensure surgical cleanup. */
  stateManager: ScenarioStateManager;
  /** Currently active authenticated persona. */
  currentPersona?: Persona;
  /** Reference to shift under test in the current scenario. */
  activeShift?: Record<string, unknown>;
  /** Reference to swap request under test in the current scenario. */
  activeSwap?: Record<string, unknown>;
  /** Stored unread notification badge count before an action. */
  initialBadgeCount?: number;
  /** Fast session injection bypassing UI login form. */
  fastLogin: (personaName: string) => Promise<void>;
}

/**
 * Extended Playwright test instance equipped with ShiftSync World fixtures.
 */
export const test = base.extend<{ world: WorldContext }>({
  world: async ({ page }, use) => {
    const stateManager = new ScenarioStateManager();

    const world: WorldContext = {
      stateManager,
      fastLogin: async (personaName: string) => {
        const persona = getPersona(personaName);
        world.currentPersona = persona;

        const { token, user } = await getApiClientForPersona(personaName);

        // Inject session credentials before page load
        await page.addInitScript(
          ({ authToken, authUser }) => {
            window.localStorage.setItem('token', authToken);
            window.localStorage.setItem('user', JSON.stringify(authUser));
          },
          { authToken: token, authUser: user },
        );

        await page.goto(persona.dashboardPath);
        await page.waitForLoadState('domcontentloaded');
      },
    };

    await use(world);

    // Surgical cleanup of any scenario-specific mutated records
    await stateManager.cleanup();
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
