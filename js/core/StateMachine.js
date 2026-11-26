/**
 * Padrão State Machine explícito para o ciclo de vida da aplicação.
 */
export const GameStates = Object.freeze({
  MENU: 'MENU',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY',
});

export class GameStateMachine {
  constructor(eventBus, initialState = GameStates.MENU) {
    this.eventBus = eventBus;
    this.current = initialState;
  }

  transition(nextState, context = {}) {
    if (this.current === nextState) return;
    const previous = this.current;
    this.current = nextState;
    this.eventBus.emit('state:changed', { previous, current: nextState, context });
  }

  is(state) {
    return this.current === state;
  }
}
