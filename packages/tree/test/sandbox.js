const observe = require('./observe');

async function wait(t = 100) { return new Promise(y => setTimeout(y, t)); }

async function main() {
  let i = 0;
  async function run(observer) {
    try {
      for (let i = 0; i < 10; i++) {
        await wait(300);
        await observer.next(i);
        // if (i === 5) throw new Error('XXX');
      }
      await observer.complete();
    } catch (err) {
      await observer.error(err);
    }
  }
  // const g = observe();
  const g = observe((observer) => {
    run(observer);
    return async (e) => {
      console.log('XXXXXXXXXXXXXx', e);
      await wait(2000);
      console.log('YYYYYYYYYYYYYY');
    }
  });

  // const promise = run(g.observer);

  for await (let n of g) {
    console.log('>', n);
    // g.sayHello();
    // if (i++ === 5) throw new Error('A') ;
  }
}

return Promise.resolve().then(main).catch(err => console.log('ERROR', err));




function gen1() {
  let counter = 0;
  const list = 'abcdefghijk';
  function finalize(interrupted = false) {
    console.log('FINISHED!', interrupted);
  }
  return {
    sayHello() { console.log('Hello'); },
    async next() {
      await wait(150);
      if (counter >= list.length) {
        // finalize();
        return { done : true }
      }
      return { value : list[counter++] };
    },
    async return() { return finalize(true); },
    throw(err) {
      console.log('XXX', err);
    },
    [Symbol.asyncIterator]() { return this; }
  };
}
