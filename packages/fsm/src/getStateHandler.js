export function getStateHandler(state, handler, clear = (()=>{})) {
  const result = {};
  const initParams = (...names) => names.reduce((params, name) => {
    params[name] = (action) => result[name] = action;
    return params;
  }, {
    state,
    process : state.process,
    getEvent : () => state.process.event,
    clear : () => clear()
  });
  return Object.assign(result, handler(initParams(
    'init', 'done',
    'before', 'after',
    'dump', 'restore', 'interrupt',
    'transition'
  )) || {});
}
