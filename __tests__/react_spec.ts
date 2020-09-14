/**
 * @jest-environment jsdom
 */
import { html } from 'htm/react';
import { render, waitForElement, waitForDomChange } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';
import { act as reactAct } from 'react-test-renderer';
const { createStore, getStore } = require('../src/index');
const { useValstore, connectValstore } = require('../src/react');

// Test component...
function App(props: any) {
  const state = props.state;

  return html`
    <div>StatelessComponent: ${state ? html`<div><span data-testid="state">State: ${JSON.stringify(state)};</span><span data-testid="foobar">${state.foobar}</span></div>` : ''}</div>
  `;
}

function testSetup() {
  const store = createStore('test', {
    foobar: 'yup',
    number: 2,
    other: 'somethingelse',
  });
  const ConnectedApp = connectValstore(getStore('test'), App);

  return { store, ConnectedApp };
}


// Tests!
describe('connectValstore', () => {
  it('should inital render with correct store values', async () => {
    const { ConnectedApp, store } = testSetup();

    await store.set('foobar', 'nope');
    const { getByTestId } = render(html`<${ConnectedApp} />`);

    expect(getByTestId('state').innerHTML).toContain('"foobar":"nope"');
  });
});

describe('useValstore', () => {
  it('test renderHook', () => {
    testSetup();
    const { result } = renderHook(() => useValstore(getStore('test')));

    reactAct(() => {
      result.current.store.set('foobar', 'test');
    });
    expect(result.current.state.foobar).toEqual('test');
  });
});


describe('render performance', () => {
  it('should only re-render when bound keys are triggered', async () => {
    const { store } = testSetup();
    let renderCount = 0;

    function WithHooks() {
      renderCount++;

      let { foobar } = useValstore(getStore('test'), {
        foobar: 'foobar',
      });

      return html`<div data-testid="state">foobar = ${foobar}</div>`;
    }

    const { getByTestId } = render(html`<${WithHooks} />`);
    expect(renderCount).toEqual(1);

    // Component should only render on keys it is bound to
    await act(async () => {
      await store.set('foobar', 'really?');
      await store.set('number', 3);
      await store.set('other', 'another_thing');
      await store.set('number', 42);
    });

    expect(renderCount).toEqual(2);
    expect(getByTestId('state').innerHTML).toContain('really?');
  });

  it('should only re-render when values actually change', async () => {
    const { store } = testSetup();
    let renderCount = 0;

    function WithHooks() {
      renderCount++;

      let { foobar } = useValstore(getStore('test'), {
        foobar: 'foobar',
      });

      return html`<div data-testid="state">foobar = ${foobar}</div>`;
    }

    const { container, getByTestId } = render(html`<${WithHooks} />`);

    await act(async () => {
      // Component should only render when these values actually change
      await store.batch('FOOBAR_UPDATE', () => {
        store.set('foobar', 'really?');
        store.set('foobar', 'really?');
        store.set('foobar', 'really?');
        store.set('foobar', 'really?!');
      });
    });

    expect(renderCount).toEqual(2);
  });
});
