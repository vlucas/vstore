var { createElement, forwardRef, useEffect, useMemo, useState } = require('react');
var _refs = {};

function mappedValues(store, keyMap) {
  var keys = keyMap ? Object.keys(keyMap) : [];
  var keyLen = keys.length;
  var mapped = {};

  for (var i = 0; i < keyLen; i++) {
    mapped[keys[i]] = store.get(keyMap[keys[i]]);
  }

  return mapped;
}

function useValstore(store, keyMap) {
  var keys = keyMap ? Object.keys(keyMap) : [];
  var keyLen = keys.length;
  var memoMap = [].concat(keys);
  var [state, setState] = useState({ value: store.get() });
  var mapped = {};

  if (keyLen) {
    for (var i = 0; i < keyLen; i++) {
      var val = store.get(keyMap[keys[i]]);
      mapped[keys[i]] = val;
      memoMap.push(val);
    }
  }

  var _lastParams;

  useEffect(() => {
    var subId = store.subscribe(newState => {
      var stateIsSame = JSON.stringify(_lastParams) === JSON.stringify(mapped);

      if (!stateIsSame) {
        setState({ value: newState });
      }

      _lastParams = mapped;
    }, keys);

    return function _valstoreReactUnsubscribe() {
      store.unsubscribe(subId);
    };
  }, memoMap);

  return Object.assign({}, mapped, { state: state });
}

function connectValstore(store, Component, keyMap) {
  return forwardRef((originProps, ref) => {
    let props = Object.assign({}, originProps, useValstore(store, keyMap), { ref: ref });
    return createElement(Component, props);
  })
}

module.exports = {
  useValstore,
  connectValstore,
};
