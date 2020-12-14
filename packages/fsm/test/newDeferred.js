/**
 * Creates and returns a "{@link deferred}" object - a newly created {@link Promise}
 * instance with exposed "resolve", "reject", "end" and "done" methods.
 * It also has the "handled" flag showing if the intent was already resolved or
 * not. After promise resolving its results are available in the "result" and
 * "error" fields.
 * @param {Object} deferred deferred object to which to which new fields should
 * be attached; if it is not defined then an empty object is used; this method
 * returns this object
 * @param {Function} deferred.onError method to invoke if the registered
 * handlers rises errors
 */
export function newDeferred(deferred = {})  {

  let resolve, reject, list = [];
  let resolveLatch, latch = new Promise(r => resolveLatch = r);

  /**
   * Promise associated with this deferred object.
   */
  deferred.promise = new Promise((y, n) => (resolve = y, reject = n));

  /** Unique identifier of this deferred object. Used for debugging. */
  deferred.id = `id-${newDeferred._counter = (newDeferred._counter || 0) + 1}`;

  /**
   * This flag shows if this promise was already resolved or not.
   *
   * @type {Boolean}
   */
  deferred.handled = false;
  /**
   * Error returned by this deferred object. By default it is undefined.
   * @type {any}
   */
  deferred.error = undefined;
  /**
   * Result returned by this deferred object. By default it is undefined.
   * @type {any}
   */
  deferred.result = undefined;
  /**
   * This method resolves this promise with the specified value.
   * @param result the resulting value for this promise
   */
  deferred.resolve = (result) => { deferred.end(undefined, result); }
  /**
   * This method resolves this promise with the specified error.
   * @param err the error which used to resolve this promise
   */
  deferred.reject = (err) => { deferred.end(err); }
  /**
   * This method notifies all registred listeners with promise results.
   * @private
   */
  const notify = async (h) => {
    await latch;
    try { await h(deferred.error, deferred.result); }
    catch (err) { try { deferred.onError && await deferred.onError(err); } catch (e) {} }
  };
  /**
   * Registers a new listener to invoke *before* this promise returns the control
   * to the callee.
   * @param {Function} h the listener to register; it will be called
   * before the promise returns the control
   */
  deferred.done = (h) => deferred.handled ? notify(h) : list.push(h);
  /**
   * Finalizes the promise with the specified error or the resulting value.
   * @param e the error used to resolve the promise; if it is not defined
   * (or null) then this promise will be resolved with the resulting value.
   * @param r the resulting value used to resolve the promise; it is
   * taken into account only if the error is not defined.
   */
  deferred.end = async (e, r) => {
    deferred.handled = true;
    deferred.end = () => {};
    try {
      deferred.error = await e;
      deferred.result = await r;
    } catch (error) {
      deferred.error = error;
    }
    resolveLatch();
    const array = list; list = null;
    await Promise.all(array.map(notify));
    if (deferred.error) reject(deferred.error);
    else resolve(deferred.result);
  }
  return deferred;
}
