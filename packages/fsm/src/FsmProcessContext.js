/*eslint no-unused-vars: ["error", { "args": "none" }]*/
import { FsmState } from './FsmState.js';
import { FsmEvent } from './FsmEvent.js';
import { FsmTransition } from './FsmTransition.js';
import { FsmProcess } from './FsmProcess.js';

export class FsmProcessContext {

  constructor(options) {
    this.options = options || {};
    ['onNewState', 'onNewProcess', 'onNewEvent', 'onNewTransition', 'onEventUpdate']
    .forEach(name => {
      if (typeof this.options[name] === 'function') {
        this[name] = this.options[name];
      }
    })
  }

  async onNewState(state) { }
  async onNewProcess(process) { return this.onNewState(process); }
  async onNewEvent(event) { }
  async onNewTransition(transition) { }

  newProcess({ descriptor, ...options }) {
    const process = new FsmProcess({
      descriptor,
      logger : this.options.logger,
      ...options,
      context : this
    });
    this.onNewProcess(process);
    return process;
  }

  /**
   * Creates and returns a new state with the given parent.
   * @param {object} options parameters
   * @param {string} options.key mandatory key of the state to create
   * @param {FsmStateDescriptor} options.descriptor mandatory state descriptor
   * @param {FsmState} options.parentState current parent state
   * @param {FsmProcess} options.process parent process
   * @return {FsmState} a new state
   */
  newState({ key, descriptor, parentState, process, ...options }) {
    const state = new FsmState({
      key,
      descriptor,
      parentState,
      process,
      logger : this.options.logger,
      ...options
    });
    this.onNewState(state);
    return state;
  }

  /**
   * Creates and returns a new state with the given parent.
   * @param {string} eventKey key of the event
   * @param {object} options event parameters (if any)
   * @return {FsmEvent} a new event
   */
  newEvent(eventKey, options = {}) {
    const event = new FsmEvent(eventKey, options);
    this.onNewEvent(event);
    return event;
  }

  /**
   * Creates and returns a new state transition.
   * @param {object} options parameters
   * @param {string} options.key mandatory key of the state to create
   * @param {FsmProcess} options.process mandatory process initializing this transition
   * @param {FsmState} options.prevState previous transition state
   * @param {FsmState} options.nextState next transition state
   * @param {object} options.params transition parameters defined in configuration
   * @return {FsmTransition} a new transition instance
   */
  newTransition(options) {
    const transition = new FsmTransition(options);
    this.onNewTransition(transition);
    // await this.onTransition(transition); // FIXME: remove it
    return transition;
  }


  onEventUpdate(process) {
  }

}
