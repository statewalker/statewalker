import { MODE } from '@statewalker/tree/index.js';
import { buildDescriptor } from './buildDescriptor.js';
import { FsmProcessConfig } from './FsmProcessConfig.js';
import { FsmProcess } from './FsmProcess.js';

export class FsmProcessRunner {

  constructor(options = {}) {
    this.options = options;
    this.index = {};
    this._processes = {};
    this._running = {};
  }

  registerProcess(key, descriptor) {
    if (descriptor === undefined) {
      descriptor = key;
      key = undefined;
    }
    descriptor = buildDescriptor(descriptor);
    key = key || descriptor.key;
    this.index[key] = descriptor;
  }

  startProcess(key, emit, mode = MODE.LEAF) {
    const descriptor = this.index[key];
    async function handle(actions) {
      let errors = [];
      for (let i = 0; i < actions.length; i++) {
        try { await actions[i](); } catch (error) { errors.push(error); }
      }
      return errors;
    }
    const config = new FsmProcessConfig({
      descriptor,
      before : async(state) => {
        const before = [];
        const after = [];
        let resolve;
        const promise = new Promise(r => resolve = r);
        const outputEvent = {
          key : state.key,
          promise,
          before(action) { before.push(action); },
          after(action) { after.unshift(action); },
          state,
          process : state.process
        }
        state._outputEventInfo = { activated : false, before, after, promise, resolve };
        try {
          emit(state.key, outputEvent);
          state._outputEventInfo.activated = true;
          const errors = await handle(state._outputEventInfo.before);
          if (errors.length) state.process.setErrors(...errors);
        } catch (error) {
          state.process.setError(error);
        }
      },
      after : async(state) => {
        if (state._outputEventInfo.activated) {
          const errors = await handle(state._outputEventInfo.after);
          if (errors.length) state.process.setErrors(...errors);
        }
        state._outputEventInfo.resolve();
        return state._outputEventInfo.promise;
      },
      onEvent : async (process) => {
        const processId = process._id;
        if (processId in this._running) return ;
        this._running[processId] = true;
        try {
          while (!process.suspended) {
            const { status } = await process.nextAsyncStep();
            if (!status) { delete this._processes[processId]; break; }
            if (status & process.mode) break;
          }
        } finally {
          delete this._running[processId];
        }
      }
    });
    const process = new FsmProcess(config);
    process.mode = mode;
    process._id = this._newId('process-');
    this._processes[process._id] = process;
    return process;
  }

  _newId(prefix = '') {
    const stamp = this._stamp = this._stamp || Date.now() + '';
    return `${prefix}${stamp}-${this._idCounter = (this._idCounter || 0) + 1}`;
  }


}
