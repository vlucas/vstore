const _vrefs: any = {};

export function getStore(storeName: string) {
  const ref = _vrefs[storeName];

  if (!ref) {
    throw new Error('[valstore] Store with name "' + storeName + '" not found! Use "createStore("name", { ... })" first.');
  }

  return ref;
}

export function setStore(storeName: string, store: any) {
  _vrefs[storeName] = store;
}

type Callback = () => void;

type Transaction = {
  name?: string,
  active: boolean,
  keys: string[],
};

type SetOptions = {
  silent?: boolean,
};

type ValstoreCallback = {
  cb: (state: any) => void,
  id: string,
  key: string | string[],
};

type ValstoreSetter = (state: any) => {};

function clone(json: object) {
  return JSON.parse(JSON.stringify(json));
}

function rand(length = 12) {
  return (+new Date * Math.random()).toString(36).substring(0, length);
}

function flat(arrays: any[]) {
  return [].concat.apply([], arrays);
}

function allKeys(key: string) {
  const arr:string[] = [];

  key.split('.').reduce(function(str: string, item : any, index : number) {
    const next = str ? str + '.' + item : item;

    arr.push(next);
    return next;
  }, '');

  return arr;
}

function oget(obj: any, props: string | string[]) {
  if (typeof props == 'string') {
    props = props.split('.');
  }
  let prop: string;
  while (props.length) {
    prop = props.shift();
    obj = obj[prop];
    if (!obj) {
      return obj;
    }
  }
  return obj;
}

function oset(obj: any, props: string | string[], value: any) {
  if (typeof props == 'string') {
    props = props.split('.');
  }
  const lastProp = props.pop();
  if (!lastProp) {
    return false;
  }
  let thisProp;
  while ((thisProp = props.shift())) {
    if (typeof obj[thisProp] == 'undefined') {
      obj[thisProp] = {};
    }
    obj = obj[thisProp];
    if (!obj || typeof obj != 'object') {
      return false;
    }
  }
  obj[lastProp] = value;
  return true;
}

function doAsync(work: Callback) {
  return Promise.resolve(work());
}

/**
 * 'create' function
 */
export function createStore(storeName: string, json: any) {
  const store = _makeStore(json);

  setStore(storeName, store);
  return store;
}

function _makeStore(json: any) {
  if (!json) {
    throw new Error('[valstore] createStore takes 2 arugments - a store name and the initial state object');
  }
  const _trx: Transaction = {
    name: null,
    active: false,
    keys: [],
  };
  let state = clone(json);
  let cbs: ValstoreCallback[] = [];

  // Public API
  const api = {
    get(key?: string | ((state: any) => {})) {
      if (!key) {
        return state;
      }
      const v = typeof key === 'function' ? key(state) : oget(state, key);

      return v;
    },
    set(key: string | ValstoreSetter, val: any, opts?: SetOptions) {
      const notify = !opts || !opts.silent;
      if (typeof key === 'function') {
        state = key(state);
        key = '*';
      } else {
        oset(state, key, val);
        if (_trx.active) {
          _trx.keys.push(key);
          return Promise.resolve(state);
        }
      }
      return notify ? api.trigger(key).then(function () { return state; }) : Promise.resolve(state);
    },
    batch(name: string, trx: Callback) {
      _trx.name = name;
      _trx.active = true;
      return doAsync(trx).then(function () { return api.batchEnd(); });
    },
    batchStart(name: string) {
      _trx.name = name;
      _trx.active = true;
    },
    batchEnd() {
      _trx.name = null;
      _trx.active = false;

      return api.trigger(_trx.keys).then(function () { _trx.keys = []; });
    },
    trigger(sKey: string | string[]) {
      const l = cbs.length;
      const keys = sKey instanceof Array ? flat(sKey.map(function (k) { return allKeys(k); })) : allKeys(sKey);
      const p = [];

      for(let i = 0; i < l; i++) {
        let cb = cbs[i];

        if (!cb) { continue; }
        if (keys.indexOf(cb.key) !== -1 || cb.key == '*') {
          p.push(doAsync(function() { return cbs[this].cb(state); }.bind(i)));
        }
      }

      return Promise.all(p);
    },
    subscribe(cb: (state: any) => void, keys?: string | string[]) {
      const id = rand(12);
      const kt = typeof keys;

      if (kt == 'undefined') {
        keys = ['*'];
      } else if (kt == 'string') {
        keys = [keys as string];
      }

      for(let i = 0; i < keys.length; i++) {
        cbs.push({
          cb: cb,
          id: id,
          key: keys[i],
        });
      }

      return id;
    },
    unsubscribe(fn: any, keys?: string | string[]) {
      if (fn === undefined) { // unsubscribe all when no arguments
        cbs = [];
        return true;
      }

      cbs = cbs.filter(function (cb) {
        return !(
          fn == cb.id
          || fn == cb.key
          || fn == cb.cb
          || (keys == cb.key && fn == cb.cb)
        );
      });
    },
  };

  return api;
}
