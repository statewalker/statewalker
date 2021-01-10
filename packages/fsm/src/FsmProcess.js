import { FsmState } from './FsmState.js';

export const NONE = 0;
export const LEAF = 1;
export const LAST = 2;
export const FIRST = 4;
export const NEXT = 8;
export const ENTER = FIRST | NEXT;
export const EXIT = LAST | LEAF;

export class FsmProcess extends FsmState {

  constructor(options) {
    super(options);
    if (!this.context) throw new Error(`Process context is not defined`);
    this._listeners = {};
    this._status = 0;
  }

  get process() { return this; }

  get context() { return this.options.context; }

  get status() { return this._status; }

  get currentState() { return this._currentState; }

  get event() { return this._event; }

  get eventKey() { return this.event ? this.event.key : ''; }

  setError(error) { return this.setEvent('error', { error }); }

  setErrors(...errors) { return this.setEvent('error', { errors }); }

  get suspended() { return !this._event; }

  get started() { return !!this._started; }

  get finished() { return this.started && !this._status; }

  acceptsEvent(eventKey, expanded) {
    return !this.currentState || this.currentState.acceptsEvent(eventKey, expanded);
  }

  setEvent(eventKey, options) {
    if (this._disableEvents) return false;
    if (eventKey === null || eventKey === undefined) delete this._event;
    else this._event = this._newEvent(eventKey, options);
    this.context.onEventUpdate(this);
    return true;
  }

  get maxRunSteps() { return this.options.maxRunSteps || 100; }

  async run(eventKey, ...args) {
    this.setEvent(eventKey, ...args);
    if (this._running) return ;
    this._running = true;
    try {
      let counter = 0;
      const maxCount = this.maxRunSteps;
      while (!this.suspended) {
        await this.nextStep();
        if (!this._status) break;
        if (counter++ > maxCount) break; // just to avoid infinite loops
      }
    } finally {
      this._running = false;
    }
  }
  async dispatch(eventKey, ...args) {
    if (this.acceptsEvent(eventKey, true)) {
      await this.run(eventKey, ...args);
    }
  }

  async* iterate(mask = LEAF) {
    const stop = (typeof mask !== 'function') ? () => (this.status & mask) : mask;
    while (true) {
      await this.nextStep();
      if (!this._status) break;
      if (stop(this)) {
        yield this._currentState;
      }
    }
  }

  suspend() { this.setEvent(undefined); }

  async dump() {
    const event = this.event;
    const result = {
      eventKey : event ? event.key : null,
      eventData : undefined,
      status : this._status,
      stack : [],
    };
    if (event) {
      const eventData = result.eventData = result.eventData || {};
      await event.doDump(eventData);
    }
    const stack = [];
    for (let s = this._currentState; s; s = s.parent) { stack.push(s); }
    for (let i = stack.length - 1; i >= 0; i--) {
      const state = stack[i];
      const stateDump = { key : state.key, data : {} };
      result.stack.push(stateDump);
      try {
        await state.doDump(stateDump.data);
      } catch (err) {
        stateDump.error = err;
        result.errors = result.errors || [];
        result.errors.push(err);
      }
    }
    return result;
  }

  async restore(dump) {
    if (this.started) throw new Error(`Can not restore an already started process`);
    // TODO: FIXME:
    let prev = this._disableEvents;
    this._disableEvents = true;

    const event = dump.eventKey !== null && dump.eventKey !== undefined
      ? await this._newEvent(dump.eventKey)
      : null;
    event && event.doRestore(dump.eventData);
    try {
      for (let i = 0, parent = this; i < dump.stack.length; i++) {
        const stateDump = dump.stack[i];
        let state;
        if (i === 0) {
          state = this;
        } else {
          state = this._currentState = await this._newSubstate(parent, stateDump.key);
        }
        parent = state;
        this._event = event;
        await state.doRestore(stateDump.data);
      }
      this._event = event;
      this._started = true;
      this._status = dump.status;
    } finally {
      this._disableEvents = prev;
    }
  }

  async interrupt() {
    this._disableEvents = true;
    this._started = true;
    this._status = 0;
    for (let state = this._currentState; state; state = state.parent) {
      this._currentState = state;
      await state.doInterrupt();
    }
  }

  async nextStep() {
    this._status = this._status || NONE;
    if (this._status & EXIT) { await this.currentState.doAfter(); }
    let parent, prev, next, transitionParams = {};
    if (!this._status) { next = this; }
    else {
      if (this._status & ENTER) {
        prev = null;
        parent = this._currentState || this;
      } else {
        prev = this._currentState;
        parent = this._currentState = prev.parent;
      }

      // Get next state
      const eventKey = this.event ? this.event.key : '';
      const stateKey = prev ? prev.key : '';
      const transitionDescriptor = parent
        ? parent.descriptor.getTransition(stateKey, eventKey)
        : null;
      let targetStateKey = null;
      next = null;
      if (transitionDescriptor) {
        targetStateKey = transitionDescriptor.targetStateKey;
        transitionParams = transitionDescriptor.params;
        next = await this._newSubstate(parent, targetStateKey);
      }
    }
    if (next) {
      this._status = (this._status & EXIT) ? NEXT : FIRST;
      await this._notifyTransition(prev, next, transitionParams);
      await this._notifyNewState(next);
      this._currentState = next;
    } else {
      this._status = (this._status & EXIT) ? LAST : LEAF;
      this._currentState = parent;
      await this._notifyTransition(prev, next, transitionParams);
    }
    if (!this._currentState) this._status = NONE;
    if (this._status & ENTER) { await this.currentState.doBefore(); }
    this._started = true;
    return this;
  }

  async _notifyNewState(state) {
    this.notify('*', state);
    this.notify(state.key, state);
  }

  on(stateKey, handler) {
    let list = this._listeners[stateKey] = this._listeners[stateKey] || [];
    list.push(handler);
    return () => this.off(stateKey, handler);
  }
  off(stateKey, handler) {
    let list = this._listeners[stateKey];
    if (list) {
      list = list.filter(h => h !== handler);
      if (list.length) this._listeners[stateKey] = list;
      else delete this._listeners[stateKey];
    }
  }
  notify(key, payload) {
    const list = this._listeners[key];
    for (let i = 0, len = list ? list.length : 0; i < len; i++) {
      list[i](payload);
    }
  }


  /**
   * Creates a new substate for the given parent state. Rises an error if
   * there is no such a state definition exists in parent states.
   *
   * @param {FsmState} parentState parent state for which a new substate
   * should be created
   * @param {string} substateKey key of the substate to create
   * @return {FsmState} a new substate
   * @throws {Error} if there is no state descriptors were found for the given
   * substate key
   */
  async _newSubstate(parentState, substateKey) {
    if (!substateKey) return null;
    const descriptor = this._getSubstateDescriptor(parentState, substateKey);
    return this._newState(parentState, substateKey, descriptor);
  }

  /**
   * Returns a state descriptor for the specified parent state and the
   * child state key. This method searches the substate definition recursively
   * in the given parent state and in all other parents. Rises an exception
   * if there is no descriptor for such a substate key.
   *
   * @param {FsmState} state parent state
   * @param {string} substateKey key of the substate
   * @return {FsmStateDescriptor} descriptor of the substate corresponding to the
   * given key
   * @throws {Error} exception if there is no substate definition in
   * the one of the parent states
   */
  _getSubstateDescriptor(state, substateKey) {
    let descriptor, implicitDescriptor;
    for (let s = state; s && (!descriptor); s = s.parent) {
      descriptor = s.descriptor.getSubstateDescriptor(substateKey);
      implicitDescriptor = implicitDescriptor || descriptor;
      if (descriptor && descriptor.implicit) descriptor = null;
    }
    descriptor = descriptor || implicitDescriptor;
    if (!descriptor) throw new Error(`Target state descriptor was not found`);
    return descriptor;
  }

  /**
   * Creates a new {@link FsmTransition} instance and notifies
   * context about a new transition between substates.
   * @param {FsmState} prevState previous transition state
   * @param {FsmState} nextState next transition state
   * @param {object} params transition parameters defined in
   * {@link FsmTransitionDescriptor} (if any)
   */
  _notifyTransition(prevState, nextState, params) {
    const parentState = this.currentState;
    if (!parentState) return ;
    const transition = this.context.newTransition({
      process : this,
      prevState,
      nextState,
      params
    })
    parentState.onTransition(transition);
  }

  _newEvent(eventKey, options) {
    return this.context.newEvent(eventKey, { process : this, ...options });
  }

  /**
   * Creates and returns a new state with the given parent.
   * @param {FsmState} parentState current parent state
   * @param {string} key mandatory key of the state to create
   * @param {FsmStateDescriptor} descriptor mandatory state descriptor for a new state
   * @return {FsmState} a new state
   */
  _newState(parentState, key, descriptor) {
    return this.context.newState({
      key, descriptor,
      process : this,
      parentState
    })
  }

  async waitWhileRunning() { return this._runPromise; }

  _startRunning() {
    if (this._runPromise) return ;
    const p = this._runPromise = new Promise(r => this._runStop = r)
      .then(() => {
      if (p !== this._runPromise) return ;
      delete this._runPromise;
      delete this._runStop;
    })
  }
  _stopRunning() {
    if (this._runStop) this._runStop();
  }

}
