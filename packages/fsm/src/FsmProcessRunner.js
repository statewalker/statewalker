import { MODE } from '@statewalker/tree/index.js';
import { buildDescriptor } from './buildDescriptor.js';
import { FsmProcessConfig } from './FsmProcessConfig.js';
import { FsmProcess } from './FsmProcess.js';

export class FsmProcessRunner {

  constructor(options = {}) {
    this.options = options;
    this.index = {};
    this._processes = {};
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

  startProcess(key, emit) {
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
        // const deferred = state._deferred = newDeferred();
        const before = [];
        const after = [];
        let resolve;
        const promise = new Promise(r => resolve = r);
        const intent = {
          key : state.key,
          promise,
          before(action) { before.push(action); },
          after(action) { after.unshift(action); },
          state,
          process : state.process
        }
        emit('*', intent);
        emit(state.key, intent);
        state._intentInfo = { before, after, promise, resolve };
        const errors = await handle(before);
        if (errors.length) state.process.setErrors(...errors);
      },
      after : async(state) => {
        const errors = await handle(state._intentInfo.after);
        if (errors.length) state.process.setErrors(...errors);
        state._intentInfo.resolve();
        return state._intentInfo.promise;
      },
      onEvent : async (process) => this._enqueueProcess(process)
    });
    const process = new FsmProcess(config);
    process._id = this._newId('process-');
    this._processes[process._id] = process;
    return process;
  }

  async _enqueueProcess(process) {
    while (!process.suspended) {
      const { status } = await process.nextAsyncStep();
      if (!status) { delete this._processes[process._id]; break; }
      if (status & MODE.LEAF) break;
    }
  }

  _newId(prefix = '') {
    const stamp = this._stamp = this._stamp || Date.now() + '';
    return `${prefix}${stamp}-${this._idCounter = (this._idCounter || 0) + 1}`;
  }


}
