# valstore

[![NPM](https://badgen.net/npm/v/valstore)](https://www.npmjs.com/package/valstore)
[![Build
Status](https://travis-ci.org/vlucas/valstore.png?branch=master)](https://travis-ci.org/vlucas/valstore)
![Minzipped Size](https://badgen.net/bundlephobia/minzip/valstore)

Featherweight key-based central store of state with zero dependencies.

Spiritual successor to [toystore](https://github.com/vlucas/toystore). *valstore*
is lighter weight, has no dependencies, and has a smaller, leaner API.

Val = Value

Store = Central store of application state

## Easy to Learn and Use

Other state management systems can be difficult or cumbersome to use, or
require a lot of repetitive boilerplate code that gets in the way.

*valstore* is based around `get` and `set` calls with nested keys for object
structures, like `store.get('foo.bar.baz')`.

## Install

Install valstore with NPM:

```
npm install valstore --save
```

## Example

Import if using ES6+ or Transpiling:
```js
import * as valstore from 'valstore';
```

Require if using ES5 or Node.js:
```js
const valstore = require('valstore');
```

Create a new store instance with its initial state using `valstore.create()`:
```js
const store = valstore.createStore('app', {
  foo: {
    bar: 'baz'
  }
});
```

## Usage With React

Valstore comes with a React hook + higher order component in the package that you can optionally import and use:

```js
// Store setup in some init/startup file...
import { createStore } from 'valstore';

createStore('app', {
  dashboard: {
    counter: 0,
  }
});

// React Component in some other file...
import { useValstore } from 'valstore/react';

function Counter() {
  const { counter, store } = useValstore('app', { counter: 'dashboard.counter' });

  return (
    <div>
      <p>Counter: {counter}</p>
      <button onClick={() => store.set('dashboard.counter', counter - 1)}> - </button>
      <button onClick={() => store.set('dashboard.counter', counter + 1)}> + </button>
    </div>
  );
}
```

## API

### createStore(storeName: string, initialState : object)

Create a new store with a name and its initial state. This should be an object.

```js
const store = valstore.createStore('app', {
  foo: {
    bar: 'baz'
  }
});
```

### get(key: string | function)

Get a value from the store by string key. Accepts simple keys like `user` and
nested keys like `foo.bar.baz`.

```js
const user = store.get('user');
const value = store.get('foo.bar.baz');
```

#### Selector Functions

If you prefer using selector functions for retrieving values from the store, you can use those with `get` also:

```js
const getFooBarBaz = state => state.foo.bar.baz;
const value = store.get(getFooBarBaz);
```

### set(key: string, value: any)

Set a value to the store with string key. Just like `get`, this accepts simple
keys like `user` and nested keys like `foo.bar.baz`.

```js
store.set('user', { id: 2, name: 'Testy McTesterpants', email: 'test@example.com' });
store.set('foo.bar.baz', 'qux');
```

#### Asynchronous Execution

The `set` method is executed asynchronously and returns a `Promise` object. You can optionally `await` the
call to `set` as needed to control the order of subscriber notifications:

```js
await store.set('user', { id: 2, name: 'Testy McTesterpants', email: 'test@example.com' });
```


### batch(name: string, trx: function)

Batches set multiple values into the store in a single transaction before broadcasting any updates. For example if you
call `store.set` twice (or even hundreds of times!) in a batch, all the affected keys will be collected, and your
matching subscribers will only fire once the batch is complete instead of once instead of once per `set` call.

Batches are a good performant way to make many `set` calls in sequence in situations where your subscribers can
wait to fire at the end.

```js
store.batch('USER_UPDATE', function () {
  store.set('user', { id: 2, name: 'Testy McTesterpants', email: 'test@example.com' });
  store.set('foo.bar.baz', 'qux');
});
```

#### Asynchronous Execution

The `batch` method is executed asynchronously and returns a `Promise` object. You can optionally `await` the
call to `set` as needed to control the order of subscriber notifications.

Note that any `set` calls made after other async methods may not be covered in the batch (for example a `set` call after
a `fetch` call that is wrapped in a separate batch). Nested batches are not recommended as they are not accounted
for by valstore and will have undefined behavior.

### subscribe(callback: function, [key: string | string[]])

Subscribe a function to changes in the store. Just like `get`, this accepts
simple keys like `user` and nested keys like `foo.bar.baz`.

Subscribe callbacks receive the current state as the first argument.

*Returns an id* of the subscription that can be used with `unsubscribe(id)`.

```js
function updateCart(state) {
  updateCartItemTotals(state.shopping.cart);
}
```

#### Subscribe to ALL/ANY changes

If you want to ALL/ANY changes in the store, just pass a function as an
argument with no keys:

```js
store.subscribe(updateCart);
```

#### Subscribe to specific key

If you want to subscribe to a specific key, specify the key as the first argument:

```js
store.subscribe(updateCart, 'shopping.cart');
```

#### Subscribe to multiple keys

If you want to subscribe to multiple keys, specify the key as an array in the first argument:

```js
store.subscribe(updateCart, ['shopping.cart', 'user']);
```

### unsubscribe(id|callback)

Unsubscribe by `id` or callback. Unsubscribes *all* registered callbacks when
called with no arguments.

```js
store.unsubscribe();
```

With key only (will unsubscribe ALL listeners on this key):
```js
store.unsubscribe('shopping.cart');
```

With key and callback:
```js
store.unsubscribe(updateCart, 'shopping.cart');
```

With subscriber id (returned from `subscribe` call):
```js
var id = store.subscribe(updateCart, 'shopping.cart');

store.unsubscribe(id);
```

### trigger(keys)

Used internally after calls to `set` or after a batch in `batch`. Triggers an update on the provided key or array
of keys. This will fire any subscriber functions that are listening on those keys.

**Note**: You should never have to call this manually. This is only documented here for completeness.

```js
store.trigger('foo.bar.baz');
store.trigger(['shopping.cart', 'user']);
```

