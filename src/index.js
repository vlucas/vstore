function clone(json) {
  return JSON.parse(JSON.stringify(json));
}

function rand(length) {
  return (+new Date * Math.random()).toString(36).substring(0, length || 12);
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

/**
 * Export 'create' function
 */
module.exports.create = function create(json) {
  var state = clone(json);
  var cbs = [];
  var api = {
    get: function get(key) {
      if (!key) {
        return clone(state);
      }
      var v = oget(state, key);

      return typeof v == 'object' ? clone(v) : v;
    },

    set: function set(key, val, opts) {
      if (!opts || !opts.silent) {
        api.trigger(key, opts);
      }
      oset(state, key, val);
      state = clone(state);
      return state;
    },
    trigger: function trigger(key, opts) {
      var l = cbs.length;

      for(var i = 0; i < l; i++) {
        var cb = cbs[i];

        if (key == cb.key || cb.key == '*') {
          (cb.opts.sync) ? cb.cb(state) : setTimeout(function() { return cbs[this].cb(state); }.bind(i), 0);
        }
      }
    },
    subscribe: function subscribe(keys, cb, opts) {
      var id = rand();
      var kt = typeof keys;

      if (kt == 'function') {
        cb = keys;
        opts = cb || {};
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
    unsubscribe: function(id) {
      if (!id) { // unsubscribe all when no arguments
        cbs = [];
        return true;
      }

      var l = cbs.length;

      for(var i = 0; i < l; i++) {
        if (id == cbs[i].id || id == cbs[i].cb) {
          delete cbs[i];
          return true;
        }
      }
    }
  };

  return api;
}
