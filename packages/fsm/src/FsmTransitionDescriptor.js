export class FsmTransitionDescriptor {
  constructor(options) {
    this.options = options;
  }
  get key() {
    if (!this._key) {
      this._key = this.options.key || this.asString();
    }
    return this._key;
  }
  get sourceStateKey() { return this.options.sourceStateKey || ''; }
  get targetStateKey() { return this.options.targetStateKey || ''; }
  get eventKey() { return this.options.eventKey; }
  asString() {
    let { sourceStateKey, eventKey, targetStateKey } = this;
    sourceStateKey = checkStateKey(sourceStateKey, '•');
    targetStateKey = checkStateKey(targetStateKey, '✕');
    eventKey = checkEventKey(eventKey);
    return `${sourceStateKey}-[${eventKey || ''}]->${targetStateKey}`;
    function checkStateKey(key, def = '') {
      if (key === '') key = def;
      else key = `(${key})`
      return key;
    }
    function checkEventKey(key) {
      return key;
    }
  }
}
