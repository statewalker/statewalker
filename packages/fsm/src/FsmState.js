import { FsmStateDescriptor } from './FsmStateDescriptor.js';
import { newId } from './newId.js';

export class FsmState {

  constructor(options) {
    this.options = options;
    if (!(this.descriptor instanceof FsmStateDescriptor)) throw new Error(`Bad state descriptor`);
    if (!this.key) throw new Error(`State key is not defined`);
    this.data = {};
    this.handlers = [];
  }

  get id() { return this._id = this._id || newId(); }

  get key() { return this.options.key || this.descriptor.key; }

  get process() { return this.options.process; }
  // _setProcess(process) { this._process = process; }

  get parent() { return this.options.parentState; }
  // _setParentState(parent) { this._parent = parent; }

  get descriptor() { return this.options.descriptor; }

  setData(key, value) { this.data[key] = value; return this; }
  getData(key, recursive=true) {
    for (let state = this; state; state = state.parent) {
      if (key in state.data) return state.data[key];
      if (!recursive) return ;
    }
  }

  getPathSegments() { return [...this.pathSegments]; }

  get pathSegments() {
    if (!this._pathSegments) {
      this._pathSegments = [];
      for (let s = this; s; s = s.parent) { this._pathSegments.unshift(s.key); }
    }
    return this._pathSegments;
  }

  get path() { return this._toPath(this.pathSegments); }

  _toPath(segments = []) { return '/' + segments.join('/') }

  addHandler(handler) {
    const slot = { h : handler, handler };
    if (typeof handler === 'function') {
      slot.handler = { before : handler };
    }
    this.handlers.push(slot);
    return () => this._removeHandler(handler);
  }

  removeHandler(handler) {
    this.handlers = this.handlers.filter(slot => (handler !== slot.h));
    return this;
  }

  async doBefore() {
    await this._callForward(async h => h.before && await h.before(this));
  }

  async doAfter() {
    await this._callBackward(async h => {
      h.after && await h.after(this);
      h.done && await h.done(this);
    });
  }

  async doInterrupt() {
    await this._callBackward(async h => {
      h.interrupt && await h.interrupt(this);
      h.done && await h.done(this);
    });
  }

  async doDump(data) {
    Object.assign(data, this.data);
    await this._callForward(async h => h.dump && await h.dump(this, data));
  }

  async doRestore(data) {
    Object.assign(this.data, data);
    await this._callForward(async h => h.restore && await h.restore(this, data));
  }

  async onTransition(transition) {
    await this._callForward(async h => h.transition && await h.transition(transition));
  }

  logError(error) {
    (this.options.logger || console).error(error);
  }

  async _callForward(action) {
    await this._call(this.handlers, action);
  }
  async _callBackward(action) {
    await this._call([...this.handlers].reverse(), action);
  }

  async _call(handlers, action) {
    let errors;
    for (let i = 0; i < handlers.length; i++) {
      try {
        const slot = handlers[i];
        const handler = slot.handler;
        if (!slot.initialized) {
          handler.init && await handler.init(this);
          slot.initialized = true;
        }
        await action(handler);
      } catch (error) {
        this.logError(error);
        errors = errors || [];
        errors.push(error);
      }
    }
    if (errors) this.process.setErrors(errors);
  }

  /**
   * Returns an index of transitions from this state. The resulting object
   * contains event keys with the corresponding path to the target state.
   */
  getTransitions(keepSegments = false) {
    const result = {};
    const transitionsIndex = this._getTransitions();
    for (let [eventKey, { parentState, transition } ] of Object.entries(transitionsIndex)) {
      const parentPathSegments = parentState.pathSegments;
      const path = [...parentPathSegments, transition.targetStateKey];
      result[eventKey] = keepSegments ? path : this._toPath(path);
    }
    return result;
  }

  /**
   * Returns an ordered list of all event keys available in this state.
   */
  getEventKeys() {
    const transitionsIndex = this._getTransitions();
    return Object.keys(transitionsIndex).sort();
  }

  /**
   * Returns true if this state accepts an event with the given key.
   */
  acceptsEvent(eventKey) {
    const transitions = this._getTransitions();
    return eventKey in transitions;
  }

  /**
   * Returns an index of all transitions from this state.
   */
  _getTransitions() {
    if (!this._transitionsIndex) {
      const index = this._transitionsIndex = {};
      let state = this;
      for (;;) {
        const parentState = state.parent;
        if (!parentState) break;
        let transitions = parentState.descriptor.getTransitions(state.key);
        for (let transition of Object.values(transitions)) {
          const eventKey = transition.eventKey;
          if (eventKey in index) continue;
          index[eventKey] = { parentState, transition };
        }
        if ('*' in index) break;
        state = parentState;
      }
    }
    return this._transitionsIndex;
  }

  _getKey(n) {
    return n ? n.key || '' : '';
  }

}
