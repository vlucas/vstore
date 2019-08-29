const valstore = require('../src/index.js');

describe('valstore.create', function () {

  it('should allow the creation of a new store', function () {
    var store = valstore.create({ foo: 'bar' });

    expect(store).not.toEqual(undefined);
  });

});

describe('valstore.get', function () {

  it('should get key', function () {
    var store = valstore.create({ foo: 'bar' });

    expect(store.get('foo')).toEqual('bar');
  });

  it('should get nested key', function () {
    var store = valstore.create({ foo: { bar: 'baz' } });

    expect(store.get('foo.bar')).toEqual('baz');
  });

  it('should get full current state when passed no arguments', function () {
    var state = { foo: 'bar' };
    var store = valstore.create(state);

    expect(store.get()).toEqual(state);
  });

  it('should not allow an object in store to be mutated by reference', function () {
    var store = valstore.create({ foo: { bar: 'baz' } });
    var val = store.get('foo');

    val.bar = 'qux';

    expect(store.get('foo.bar')).toEqual('baz');
  });

  it('should not allow an array in store to be mutated by reference', function () {
    var store = valstore.create({ ids: [3, 4, 2, 1] });
    var val = store.get('ids');

		expect(() => {
			val.sort();
		}).toThrowError('read only');
  });
});

describe('valstore.set', function () {

  it('should set key', function () {
    var store = valstore.create({ foo: 'bar' });

    store.set('foo', 'baz');

    expect(store.get('foo')).toEqual('baz');
  });

  it('should set nested key', function () {
    var store = valstore.create({ foo: { bar: 'baz' } });

    store.set('foo.bar', 'qux');

    expect(store.get('foo.bar')).toEqual('qux');
  });

  it('should get full updated state when passed no arguments', function () {
    var state = { foo: 'bar' };
    var store = valstore.create(state);

    store.set('foo', 'baz');

    expect(store.get()).not.toEqual(state);
  });
});

describe('valstore.subscribe', function () {
  var counter = 0;
  var counterIncrement = function () { counter = counter+1; };
  var TIMEOUT_WAIT = 1;

  beforeEach(function () {
    counter = 0;
  });

  it('should subscribe to all changes when only passing in a callback', function (done) {
    var store = valstore.create({ foo: 'bar', items: 2 });

    store.subscribe(counterIncrement);
    store.set('foo', 'baz');
    store.set('items', 42);

    setTimeout(function () {
      expect(counter).toEqual(2);
      done();
    }, TIMEOUT_WAIT);
  });

  it('should subscribe to key', function (done) {
    var store = valstore.create({ foo: 'bar' });

    store.subscribe('foo', counterIncrement);
    store.set('foo', 'baz');

    setTimeout(function () {
      expect(counter).toEqual(1);
      done();
    }, TIMEOUT_WAIT);
  });

  it('should call subscriber on root key when nested key receives an update', function (done) {
    var store = valstore.create({ cart: { items: [] } });

    store.subscribe('cart', counterIncrement); // subscribe to root key
    store.set('cart.items', [ 123 ]); // update nested key

    setTimeout(function () {
      expect(counter).toEqual(1);
      done();
    }, TIMEOUT_WAIT);
  });

  it('should return the current store state as the first argument in a callback', function (done) {
    var store = valstore.create({ foo: 'bar' });
    var result;

    store.subscribe('foo', function (res) { result = res; });
    store.set('foo', 'baz');

    setTimeout(function () {
      expect(result).toEqual(store.get());
      done();
    }, TIMEOUT_WAIT);
  });

  it('should subscribe to multiple keys when given array', function (done) {
    var store = valstore.create({ foo: 'bar', bar: 'baz' });

    store.subscribe(['foo', 'bar'], counterIncrement);
    store.set('foo', 'baz');
    store.set('bar', 'qux');

    setTimeout(function () {
      expect(counter).toEqual(2);
      done();
    }, TIMEOUT_WAIT);
  });
});

describe('valstore.unsubscribe', function () {
  var counter = 0;
  var counter2 = 0;
  var counterIncrement = function () { counter = counter+1; };
  var counterIncrement2 = function () { counter2 = counter2+1; };
  var TIMEOUT_WAIT = 1;

  beforeEach(function () {
    counter = 0;
    counter2 = 0;
  });

  it('should unsubscribe with matching key and callback', function (done) {
    var store = valstore.create({ foo: 'bar' });

    store.subscribe('foo', counterIncrement);
    store.unsubscribe('foo', counterIncrement);
    store.set('foo', 'baz');

    setTimeout(function () {
      expect(counter).toEqual(0);
      done();
    }, TIMEOUT_WAIT);
  });

  it('should unsubscribe with key only', function (done) {
    var store = valstore.create({ foo: 'bar', bar: 'baz' });

    store.subscribe('foo', counterIncrement);
    store.subscribe('foo', counterIncrement2);
    store.unsubscribe('foo');
    store.set('foo', 'baz');
    store.set('bar', 'qux');

    setTimeout(function () {
      expect(counter).toEqual(0);
      expect(counter2).toEqual(0);
      done();
    }, TIMEOUT_WAIT);
  });

  it('should unsubscribe with subscriber id', function (done) {
    var store = valstore.create({ foo: 'bar', bar: 'baz' });
    var id = store.subscribe('foo', counterIncrement);

    store.unsubscribe(id);
    store.set('foo', 'baz');

    setTimeout(function () {
      expect(counter).toEqual(0);
      done();
    }, TIMEOUT_WAIT);
  });
});
