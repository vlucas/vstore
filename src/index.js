function clone(json) {
  return JSON.parse(JSON.stringify(json));
}

function rand(length) {
  return (+new Date * Math.random()).toString(36).substring(0, length || 12);
}

function flat(arrays) {
  return [].concat.apply([], arrays);
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

function deepFreeze(object) {
  // Retrieve the property names defined on object
  var propNames = Object.getOwnPropertyNames(object);

  // Freeze properties before freezing self
  for (let name of propNames) {
    let value = object[name];

    object[name] = value && typeof value === "object" ? deepFreeze(value) : value;
  }

  return Object.freeze(object);
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
  setTimeout(work, 0);
}

/**
 * Export 'create' function
 */
module.exports.create = function create(json) {
  var _trx = {
    active: false,
    keys: [],
  };
  var state = deepFreeze(json);
  var cbs = [];
  var api = {
    get: function(key) {
      if (!key) {
        return state;
      }
      var v = oget(state, key);

      return v;
    },
    set: function(key, val, opts) {
      state = clone(state);
      oset(state, key, val);
      state = deepFreeze(state);
      if (!opts || !opts.silent) {
        _trx.active ? _trx.keys.push(key) : api.trigger(key, opts);
      }
      return state;
    },
    transaction: function (trx, opts) {
      _trx.active = true;
      trx();
      function end() {
        _trx.active = false;
        api.trigger(_trx.keys, opts);
        _trx.keys = [];
      }
      opts && opts.sync ? end() : doAsync(end);
    },
    trigger: function(sKey, opts) {
      var l = cbs.length;
      var keys = sKey instanceof Array ? flat(sKey.map(function (k) { return allKeys(k); })) : allKeys(sKey);

      for(var i = 0; i < l; i++) {
        var cb = cbs[i];

        if (!cb) { continue; }
        if (keys.indexOf(cb.key) !== -1 || cb.key == '*') {
          (cb.opts.sync) ? cb.cb(state) : doAsync(function() { return cbs[this].cb(state); }.bind(i));
        }
      }
    },
    subscribe: function(keys, cb, opts) {
      var id = rand();
      var kt = typeof keys;

      if (kt == 'function') {
        opts = cb || {};
        cb = keys;
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
    unsubscribe: function(id, fn) {
      if (id === undefined) { // unsubscribe all when no arguments
        cbs = [];
        return true;
      }

      cbs = cbs.filter(function (cb) {
        return !(
          id == cb.id
          || id == cb.key
          || id == cb.cb
          || (id == cb.key && fn == cb.cb)
        );
      });
    }
  };

  return api;
}

module.exports.clone = clone;
module.exports.deepFreeze = deepFreeze;
