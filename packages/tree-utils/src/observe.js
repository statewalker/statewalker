export function observe(initialize=()=>{}) {
  let prev = newPromise();
  prev.resolve();
  let nextPromise = newPromise();
  async function update(obj) {
    if (obj.error) nextPromise.reject(obj.error)
    else nextPromise.resolve(obj);
    await prev;
    prev = newPromise();
  }
  const observer = {
    async next(value){ return await update({ value }); },
    async error(error) { return await update({ error }); },
    async complete() { return await update({ done : true }); },
  };
  let finalize = initialize(observer) || (()=>{});
  return {
    observer,
    async next() {
      try {
        let item = await nextPromise;
        if (item.done) await finalize();
        return item;
      } catch (error) {
        await finalize(error);
        throw error;
      } finally {
        nextPromise = newPromise();
        prev.resolve();
      }
    },
    async return() {
      if (typeof finalize === 'function') await finalize();
    },
    [Symbol.asyncIterator]() { return this; }
  };

  function newPromise() {
    let resolve, reject;
    const promise = new Promise((y,n) => (resolve = y, reject = n));
    promise.resolve = resolve;
    promise.reject = reject;
    return promise;
  }
}
