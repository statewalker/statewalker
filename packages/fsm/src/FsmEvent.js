export class FsmEvent {

  constructor(options) {
    this.options = options;
    if (this.key === null || this.key === undefined) throw new Error(`Event key is not defined`);
  }
  
  get key() { return this.options.key; }
}
