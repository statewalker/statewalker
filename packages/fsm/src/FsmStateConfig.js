import { FsmStateDescriptor } from './FsmStateDescriptor.js';

export class FsmStateConfig {

  constructor(options) {
    this.options = options || {};
    if (!(this.descriptor instanceof FsmStateDescriptor)) throw new Error(`Bad state descriptor`);
    if (!this.key) throw new Error(`State key is not defined`);
  }

  get key() { return this.options.key || this.options.descriptor.key; }

  get descriptor() { return this.options.descriptor; }

}
