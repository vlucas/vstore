const { createElement, forwardRef, useEffect, useState } = require('react');

function useValstore(store: any, keyMap?: any) {
  const keys = keyMap ? Object.keys(keyMap) : [];
  const keyLen = keys.length;
  const memoMap = [].concat(keys);
  const [state, setState] = useState({ value: store.get() });
  const mapped: any = {};

  if (keyLen) {
    for (let i = 0; i < keyLen; i++) {
      const val = store.get(keyMap[keys[i]]);
      mapped[keys[i]] = val;
      memoMap.push(val);
    }
  }

  let _lastParams : any;

  useEffect(() => {
    const subId = store.subscribe((newState: any) => {
      const stateIsSame = JSON.stringify(_lastParams) === JSON.stringify(mapped);

      if (!stateIsSame) {
        setState({ value: newState });
      }

      _lastParams = mapped;
    }, keys);

    return function _valstoreReactUnsubscribe() {
      store.unsubscribe(subId);
    };
  }, memoMap);

  return Object.assign({}, mapped, { state: state.value, store });
}

function connectValstore(store: any, Component: any, keyMap?: any) {
  return forwardRef((originProps: any, ref: any) => {
    const props = Object.assign({}, originProps, useValstore(store, keyMap), { ref });
    // @ts-ignore-next-line
    return createElement(Component, props);
  })
}

module.exports = {
  connectValstore,
  useValstore,
};
