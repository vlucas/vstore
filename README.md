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
import valstore from 'valstore';
```

Require if using ES5 or Node.js:
```js
const valstore = require('valstore');
```

Create a new store instance using `valstore.create()`:
```js
var store = valstore.create({
  foo: {
    bar: 'baz'
  }
});
```

## API

### get(key)

Get a value from the store by string key. Accepts simple keys like `user` and
nested keys like `foo.bar.baz`.

```js
let user = store.get('user');
let value = store.get('foo.bar.baz');
```

### set(key, value)

Set a value to the store with string key. Just like `get`, this accepts simple
keys like `user` and nested keys like `foo.bar.baz`.

```js
store.set('user', { id: 2, name: 'Testy McTesterpants', email: 'test@example.com' });
store.set('foo.bar.baz', 'qux');
```

### transaction(function)

Transactions set multiple values into the store in a batch before broadcasting any updates. For example if you call
`store.set` twice (or even hundreds of times!) in a transaction, all the affected keys will be collected, and your
matching subscribers will only fire once the transaction is complete instead of once instead of once per `set` call.

Transactions are a good performant way to make many `set` calls in sequence in situations where your subscribers can
wait to fire at the end.

```js
store.transaction(function () {
  store.set('user', { id: 2, name: 'Testy McTesterpants', email: 'test@example.com' });
  store.set('foo.bar.baz', 'qux');
});
```

Note that any async `set` calls made will not be covered in the transaction (for example a `set` call after a `fetch`
call that is wrapped in a transaction). Nested transactions are not supported.

### subscribe([key, ]callback)

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
store.subscribe('shopping.cart', updateCart);
```

#### Subscribe to multiple keys

If you want to subscribe to multiple keys, specify the key as an array in the first argument:

```js
store.subscribe(['shopping.cart', 'user'], updateCart);
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
store.unsubscribe('shopping.cart', updateCart);
```

With subscriber id (returned from `subscribe` call):
```js
var id = store.subscribe('shopping.cart', updateCart);

store.unsubscribe(id);
```
