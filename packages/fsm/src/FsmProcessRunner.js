import { buildDescriptor } from './buildDescriptor.js';
import { FsmProcessContext } from './FsmProcessContext.js';
import { LEAF } from './FsmProcess.js';

export class FsmProcessRunner extends FsmProcessContext {

  constructor(options = {}) {
    super(options);
    this.index = {};
    this._scheduledIndex = {};
    this._scheduledQueue = [];
  }

  emit(key, event) {
    this.options.emit(key, event);
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

  onEventUpdate(process) {
    this._schedule(process);
  }

  startProcess(key) {
    const descriptor = this.index[key];
    if (!descriptor) throw new Error(`No process descriptor was found. key="${key}"`);
    const process = this.newProcess({ descriptor });
    this._schedule(process);
    return process;
  }

  _schedule(process) {
    if (process.suspended || process.finished) return ;
    if (process.id in this._scheduledIndex) return ;
    this._scheduledIndex[process.id] = process;
    process._startRunning();
    (async () => {
      try {
        while ((!process.suspended) && (!process.finished)) {
          await process.nextStep();
          if (process.status & LEAF) break;
        }
      } finally {
        process._stopRunning();
        delete this._scheduledIndex[process.id];
      }
    })();
  }

  // _schedule(process) {
  //   if (process.suspended || process.finished) {
  //     process._stopRunning();
  //     return ;
  //   }
  //   if (process.id in this._scheduledIndex) return ;
  //   this._scheduledIndex[process.id] = process;
  //   this._scheduledQueue.push(process);
  //   process._startRunning();
  //   if (this._scheduledQueue.length === 1) {
  //     this._startHandling();
  //   }
  // }
  //
  // async _startHandling() {
  //   while (this._scheduledQueue.length) {
  //     const process = this._scheduledQueue.pop();
  //     delete this._scheduledIndex[process.id];
  //     if (process.suspended || process.finished) {
  //       process._stopRunning();
  //       continue;
  //     }
  //     if (!process.suspended && !process.finished) {
  //       await process.nextStep();
  //       console.log('>>>', process.currentState.key, process.status, process.eventKey, (process.status & LEAF))
  //       if (!(process.status & LEAF)) this._schedule(process);
  //       else process._stopRunning();
  //       // for await (let state of process.iterate()) {
  //       //   console.log('X', state.path);
  //       //   // process.suspend();
  //       //   break;
  //       // }
  //       // process._stopRunning();
  //     } else {
  //       process._stopRunning();
  //     }
  //   }
  // }

}
