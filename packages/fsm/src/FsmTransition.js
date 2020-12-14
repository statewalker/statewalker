import { FsmEvent } from './FsmEvent.js';
import { FsmTransitionDescriptor } from './FsmTransitionDescriptor.js';

export class FsmTransition extends FsmEvent {

  constructor(options) {
    if (!(options.descriptor instanceof FsmTransitionDescriptor)) throw new Error(`Bad transition descriptor type`);
    super(options);
    // if (!(this.descriptor instanceof FsmTransitionDescriptor)) throw new Error(`Bad transition descriptor type`);
  }

  get key() { return this.options.key || this.descriptor.key; }

  get descriptor() { return this.options.descriptor; }

  toString() { return this.descriptor.asString(); }

}
