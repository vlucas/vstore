const valstore = require('../index.js');

describe('valstore.createStore', function () {

  it('should allow the creation of a new store', function () {
    var store = valstore.createStore('test', { foo: 'bar' });

    expect(store).not.toEqual(undefined);
  });

});

describe('valstore.get', function () {

  it('should get key', function () {
    var store = valstore.createStore('test', { foo: 'bar' });

    expect(store.get('foo')).toEqual('bar');
  });

  it('should get nested key', function () {
    var store = valstore.createStore('test', { foo: { bar: 'baz' } });

    expect(store.get('foo.bar')).toEqual('baz');
  });

  it('should get full current state when passed no arguments', function () {
    var state = { foo: 'bar' };
    var store = valstore.createStore('test', state);

    expect(store.get()).toEqual(state);
  });

  it('should accept a function selector as a single argument', function () {
    var store = valstore.createStore('test', { foo: { bar: 'baz' } });

    expect(store.get(state => state.foo.bar)).toEqual('baz');
  });
});

describe('valstore.set', function () {

  it('should set key', function () {
    var store = valstore.createStore('test', { foo: 'bar' });

    store.set('foo', 'baz');

    expect(store.get('foo')).toEqual('baz');
  });

  it('should set nested key', function () {
    var store = valstore.createStore('test', { foo: { bar: 'baz' } });

    store.set('foo.bar', 'qux');

    expect(store.get('foo.bar')).toEqual('qux');
  });

  it('should get full updated state when passed no arguments', function () {
    var state = { foo: 'bar' };
    var store = valstore.createStore('test', state);

    store.set('foo', 'baz');

    expect(store.get()).not.toEqual(state);
  });

  it('should set new object over root', function () {
    var store = valstore.createStore('test', { foo: { bar: 'baz' } });

    store.set('foo', { baz: 'qux' });

    expect(store.get('foo.bar')).toEqual(undefined);
  });

  it('should deep merge new object over root one when merge option is true', function () {
    var store = valstore.createStore('test', { foo: { bar: 'baz' } });

    store.set('foo', { baz: 'qux' }, { merge: true });

    expect(store.get('foo.bar')).toEqual('baz');
    expect(store.get('foo.baz')).toEqual('qux');
  });

  it('should return a Promise', async function () {
    var store = valstore.createStore('test', { foo: { bar: 'baz' } });

    await store.set('foo.bar', 'qux');

    expect(store.get('foo.bar')).toEqual('qux');
  });
});

describe('valstore.batch', function () {
  var counter = 0;
  var counterIncrement = function () { counter = counter+1; };

  beforeEach(function () {
    counter = 0;
  });

  it('should broadcast updates only once at the end of the batch', async function () {
    var store = valstore.createStore('test', {
      foo: 'bar',
      bar: 'baz',
      user: null,
      someData: {
        someId: 1,
      },
    });

    store.subscribe(counterIncrement, { sync: true });

    await store.batch('batchNameHere', function () {
      store.set('user', { id: 1, username: 'test', name: 'Testy McTesterpants' });
      store.set('someData.someId', 2);
    });

    expect(counter).toEqual(1);
  });

  it('should fire updates on root key for update on nested key in batch', async function () {
    var store = valstore.createStore('test', {
      someData: {
        someId: 1,
      },
      user: null,
    });

    store.subscribe(counterIncrement, 'someData', { sync: true });

    await store.batch('batchNameHere', function () {
      store.set('user', { id: 1, username: 'test', name: 'Testy McTesterpants' });
      store.set('someData.someId', 2);
    });

    expect(counter).toEqual(1);
  });

  it('should broadcast updates only once at the end of the batch when the same key is updated more than once', async function () {
    const store = valstore.createStore('test', {
      someData: {
        someId: 1,
      },
    });

    store.subscribe(counterIncrement, 'someData.someId', { sync: true });

    await store.batch('batchNameHere', function () {
      store.set('someData', { someId: 42 });
      store.set('someData.someId', 2);
      store.set('someData.someId', 3);
      store.set('someData.someId', 4);
    });

    expect(counter).toEqual(1);
  });

});

describe('valstore.subscribe', function () {
  let counter = 0;
  const counterIncrement = function () { counter = counter+1; };

  beforeEach(function () {
    counter = 0;
  });

  it('should subscribe to all changes when only passing in a callback', async function () {
    const store = valstore.createStore('test', { foo: 'bar', items: 2 });

    store.subscribe(counterIncrement);
    await store.set('foo', 'baz');
    await store.set('items', 42);

    expect(counter).toEqual(2);
  });

  it('should subscribe to key', async function () {
    const store = valstore.createStore('test', { foo: 'bar' });

    store.subscribe(counterIncrement, 'foo');
    await store.set('foo', 'baz');

    expect(counter).toEqual(1);
  });

  it('should call subscriber on root key when nested key receives an update', async function () {
    const store = valstore.createStore('test', { cart: { items: [] } });

    store.subscribe(counterIncrement, 'cart'); // subscribe to root key
    await store.set('cart.items', [ 123 ]); // update nested key

    expect(counter).toEqual(1);
  });

  it('should return the current store state as the first argument in a callback', async function () {
    const store = valstore.createStore('test', { foo: 'bar' });
    let result;

    store.subscribe(function (res) { result = res; }, 'foo');
    await store.set('foo', 'baz');

    expect(result).toEqual(store.get());
  });

  it('should subscribe to multiple keys when given array', async function () {
    const store = valstore.createStore('test', { foo: 'bar', bar: 'baz' });

    store.subscribe(counterIncrement, ['foo', 'bar']);
    await store.set('foo', 'baz');
    await store.set('bar', 'qux');

    expect(counter).toEqual(2);
  });
});

describe('valstore.unsubscribe', function () {
  let counter = 0;
  let counter2 = 0;
  const counterIncrement = function () { counter = counter+1; };
  const counterIncrement2 = function () { counter2 = counter2+1; };

  beforeEach(function () {
    counter = 0;
    counter2 = 0;
  });

  it('should unsubscribe with matching key and callback', async function () {
    const store = valstore.createStore('test', { foo: 'bar' });

    store.subscribe(counterIncrement, 'foo');
    store.unsubscribe(counterIncrement, 'foo');
    await store.set('foo', 'baz');

    expect(counter).toEqual(0);
  });

  it('should unsubscribe with key only', async function () {
    const store = valstore.createStore('test', { foo: 'bar', bar: 'baz' });

    store.subscribe(counterIncrement, 'foo');
    store.subscribe(counterIncrement2, 'foo');
    store.unsubscribe('foo');
    await store.set('foo', 'baz');
    await store.set('bar', 'qux');

    expect(counter).toEqual(0);
    expect(counter2).toEqual(0);
  });

  it('should unsubscribe with subscriber id', async function () {
    const store = valstore.createStore('test', { foo: 'bar', bar: 'baz' });
    const id = store.subscribe(counterIncrement, 'foo');

    store.unsubscribe(id);
    await store.set('foo', 'baz');

    expect(counter).toEqual(0);
  });
});
