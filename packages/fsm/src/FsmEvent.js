export class FsmEvent {

  constructor(key, options = {}) {
    this.options = options;
    this._key = key;
    // if (!this.key) throw new Error(`Event key is not defined`);
  }

  get key() { return this._key || ''; }

  async doDump(data) {
    Object.assign(data, this.options);
  }

  async doRestore(data) {
    Object.assign(this.options, data);
  }

}
