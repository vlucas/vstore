var _refs = {};

function clone(json) {
  return JSON.parse(JSON.stringify(json));
}

function rand(length) {
  return (+new Date * Math.random()).toString(36).substring(0, length || 12);
}

function flat(arrays) {
  return [].concat.apply([], arrays);
}

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Performs a deep merge of objects and returns new object. Does not modify
 * objects (immutable) and merges arrays via concatenation.
 *
 * @param {...object} objects - Objects to merge
 * @returns {object} New object with merged key/values
 */
function mergeDeep(/*...objects */) {
  var objects = Array.prototype.slice.call(arguments);
  var pVal, oVal;

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      pVal = prev[key];
      oVal = obj[key];

      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = pVal.concat.apply(pVal, oVal);
      }
      else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      }
      else {
        prev[key] = oVal;
      }
    });

    return prev;
  }, {});
}

function allKeys(key) {
  var arr = [];

  key.split('.').reduce(function(str, item, index) {
    var next = str ? str + '.' + item : item;

    arr.push(next);
    return next;
  }, '');

  return arr;
}

function oget(obj, props) {
  if (typeof props == 'string') {
    props = props.split('.');
  }
  var prop;
  while (props.length) {
    prop = props.shift();
    obj = obj[prop];
    if (!obj) {
      return obj;
    }
  }
  return obj;
}

function oset(obj, props, value) {
  if (typeof props == 'string') {
    props = props.split('.');
  }
  var lastProp = props.pop();
  if (!lastProp) {
    return false;
  }
  var thisProp;
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

function doAsync(work) {
  return Promise.resolve(work());
}

/**
 * 'create' function
 */
function createStore(storeName, json) {
  if (!json) {
    throw new Error('[valstore] createStore takes 2 arugments - a store name and the initial state object');
  }
  var _trx = {
    name: null,
    active: false,
    keys: [],
  };
  var state = clone(json);
  var cbs = [];
  var api = {
    get: function(key) {
      if (!key) {
        return state;
      }
      var v = typeof key === 'function' ? key(state) : oget(state, key);

      return v;
    },
    set: function(key, val, opts) {
      var notify = !opts || !opts.silent;
      if (opts && opts.merge) {
        var gVal = oget(state, key);
        var nVal = mergeDeep(gVal, val);
        oset(state, key, nVal);
      } else {
        oset(state, key, val);
      }
      if (_trx.active) {
        _trx.keys.push(key);
        return Promise.resolve(state);
      }
      return notify ? api.trigger(key, opts).then(function () { return state; }) : Promise.resolve(state);
    },
    batch: function (name, trx, opts) {
      _trx.name = name;
      _trx.active = true;
      return doAsync(trx).then(function () { return api.batchEnd(); });
    },
    batchStart: function (name) {
      _trx.name = name;
      _trx.active = true;
    },
    batchEnd: function () {
      _trx.name = null;
      _trx.active = false;

      return api.trigger(_trx.keys).then(function () { _trx.keys = []; });
    },
    trigger: function(sKey, opts) {
      var l = cbs.length;
      var keys = sKey instanceof Array ? flat(sKey.map(function (k) { return allKeys(k); })) : allKeys(sKey);
      var p = [];

      for(var i = 0; i < l; i++) {
        var cb = cbs[i];

        if (!cb) { continue; }
        if (keys.indexOf(cb.key) !== -1 || cb.key == '*') {
          p.push(doAsync(function() { return cbs[this].cb(state); }.bind(i)));
        }
      }

      return Promise.all(p);
    },
    subscribe: function(cb, keys, opts) {
      var id = rand();
      var kt = typeof keys;

      if (kt == 'object') {
        opts = keys;
        keys = ['*'];
      } else if (kt == 'undefined') {
        keys = ['*'];
      } else if (kt == 'string') {
        keys = [keys];
      }

      for(var i = 0; i < keys.length; i++) {
        cbs.push({
          cb: cb,
          id: id,
          key: keys[i],
          opts: opts || {},
        });
      }

      return id;
    },
    unsubscribe: function(fn, keys) {
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
    }
  };

	_refs[storeName] = api;

  return api;
}

function getStore(storeName) {
  const ref = _refs[storeName];

  if (!ref) {
    throw new Error('[valstore] Store with name "' + store + '" not found! Use "createStore("name", { ... })" first.');
  }

  return ref;
}

module.exports.clone = clone;
module.exports.createStore = createStore;
module.exports.getStore = getStore;