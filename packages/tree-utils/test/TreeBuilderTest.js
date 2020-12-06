import expect from 'expect.js';
import { treeBuilder } from '../src/index.js';

describe('treeBuilder', async () => {

  it('should build trees from paths', () => {
    // const print = (s) => {
    //   console.log(state.stack.map(_ => ' ').join(''), s);
    // }
    const compare = (a, b)=>(a.path === b.path && a.dir === b.dir);
    const list = [];
    const next = treeBuilder({
      compare,
      before({ node }) {
        list.push(node);
      }
    });
    const paths = [
      '/foo/bar/baz/boo',
      '/docs/a/my-file.txt',
      '/docs/a/readme.txt',
      '/docs/foobar.txt',
      '/src/index.js',
      '/src/lib/helper/one/two/three/first.js',
      '/src/lib/helper/one/two/three/second.js',
      '/src/hello.js',
   ]
   for (let path of paths) {
     const p = [];
     const segments = path.split('/').filter(_ => !!_);
     let prev = '';
     for (let i = 0; i < segments.length; i++) {
       const name = segments[i];
       const node = {
         path : prev + '/' + name,
         dir : i < segments.length - 1
       }
       prev = node.path;
       p.push(node);
     }
     next(p);
   }
   next.end();
   // console.log(list);
   expect(list).to.eql([
     { path : '/foo', dir : true },
     { path : '/foo/bar', dir : true },
     { path : '/foo/bar/baz', dir : true },
     { path : '/foo/bar/baz/boo', dir : false },
     { path : '/docs', dir : true },
     { path : '/docs/a', dir : true },
     { path : '/docs/a/my-file.txt', dir : false },
     { path : '/docs/a/readme.txt', dir : false },
     { path : '/docs/foobar.txt', dir : false },
     { path : '/src', dir : true },
     { path : '/src/index.js', dir : false },
     { path : '/src/lib', dir : true },
     { path : '/src/lib/helper', dir : true },
     { path : '/src/lib/helper/one', dir : true },
     { path : '/src/lib/helper/one/two', dir : true },
     { path : '/src/lib/helper/one/two/three', dir : true },
     { path : '/src/lib/helper/one/two/three/first.js', dir : false },
     { path : '/src/lib/helper/one/two/three/second.js', dir : false },
     { path : '/src/hello.js', dir : false },
   ])
  })
})
