const stamp = Date.now();
let idCounter = 0;
export function newId(prefix='id-') { return `${prefix}-${stamp}-${idCounter++}`; }
