import { MODE } from '@statewalker/tree/index.js';
import { FsmStateConfig } from './FsmStateConfig.js';

export class FsmProcessConfig extends FsmStateConfig {
  constructor(options) {
    super(options);
    if (typeof this.options.before === 'function') this.doBefore = this.options.before;
    if (typeof this.options.after === 'function') this.doAfter = this.options.after;
    if (typeof this.options.transition === 'function') this.onTransition = this.options.transition;
    if (typeof this.options.onEvent === 'function') this.onEventUpdate = this.options.onEvent;
  }

  get mode() { return this.options.mode || MODE.LEAF; }

  doBefore(/* state */) { }
  doAafter(/* state */) { }
  onTransition(/* transition */) { }
  onEventUpdate(/* process */) { }

}
