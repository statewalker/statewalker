import { FsmProcessContext } from './FsmProcessContext.js';

export class FsmEventedProcessContext extends FsmProcessContext {

  constructor(options) {
    super(options);
    if (typeof this.emit !== 'function') throw new Error(`'emit' method is not defined`);
    // this.emit = this.options.emit;
  }

  async doBefore(state) {
    this._init(state);
    await this._call('before', state);
  }

  async doAfter(state) {
    await this._call('after', state);
    this._done(state);
  }

  async interruptState(state) {
    await this._call('interrupt', state);
    this._done(state);
  }

  async dumpState(state, data) {
    await this._call('dump', state, data);
  }

  async restoreState(state, data) {
    this._init(state);
    await this._call('restore', state, data);
  }

  async onTransition(transition) {
    const state = transition.process.currentState;
    state && await this._call('transition', state, transition);
  }

  _init(state) {
    const noop = () => {};
    const handlers = state.handlers = state.handlers || [];
    const handler = {
      before : noop,
      after : noop,
      interrupt : noop,
      dump : noop,
      restore : noop,
      transition : noop
    };
    handlers.push(handler);
    const clear = () => {
      state.handlers = state.handlers.filter(h => h !== handler);
      for (let key of Object.keys(handler)) { handler[key] = noop; }
    }

    const event = {
      state,
      process : state.process,
      stateKey : state.key,
      setEvent(...args) { state.process.setEvent(...args); },
      getEvent() { return state.process.event; },
      getEventKey() { return state.process.eventKey; },

      before(action) { handler.before = action; },
      after(action) { handler.after = action; },
      interrupt(action) { handler.interrupt = action; },
      dump(action) { handler.dump = action; },
      restore(action) { handler.restore = action; },
      transition(action) { handler.transition = action; },
      clear
    }
    this.emit(state.key, event);
  }

  _done(state) {
    state.handlers = [];
  }

  async _call(method, state, ...args) {
    const handlers = state.handlers || [];
    let errors;
    for (let handler of handlers) {
      try {
        await handler[method](...args);
      } catch (error) {
        console.log('ERROR', error);
        errors = errors || [];
        errors.push(error);
      }
    }
    if (errors) state.process.setErrors(errors);
  }

}
