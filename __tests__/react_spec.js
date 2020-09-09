const React = require('react');
const { html } = require('htm/react');
const { createStore } = require('../index');
const { useValstore, connectValstore } = require('../react/index');

/*
const Enzyme = require('enzyme');
const Adapter = require('enzyme-adapter-react-16');
const { render } = Enzyme;

Enzyme.configure({ adapter: new Adapter() });
*/

// React testing-library
const { render, screen, waitForElement, waitForDomChange } = require('@testing-library/react');
const { renderHook } = require('@testing-library/react-hooks');
const { act } = require('react-dom/test-utils');
//require('@testing-library/jest-dom/extend-expect');

// Test component...
function App(props) {
  const state = props.state;

  return html`
    <div>StatelessComponent: ${state ? html`<span data-testid="state">State: ${JSON.stringify(state)}</span>` : ''}</div>
  `;
}

function testSetup() {
  const store = createStore('test', {
    foobar: 'yup',
    number: 2,
    other: 'somethingelse',
  });
  const ConnectedApp = connectValstore(store, App);

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

  it('should re-render with new store data', async () => {
    const { ConnectedApp, store } = testSetup();
    const { getByTestId } = render(html`<${ConnectedApp} />`);

    await act(async () => {
      await store.set('foobar', 'nope');
    });

    expect(getByTestId('state').innerHTML).toContain('"foobar":"nope"');
  });
});

describe('useValstore', () => {
  it('should use hooks to re-render with store update', async () => {
    const { store } = testSetup();

    function WithHooks() {
      let { state } = useValstore(store);

      return html`<div data-testid="state">${JSON.stringify(state)}</div>`;
    }

    const { container, getByTestId } = render(html`<${WithHooks} />`);

    await act(async () => {
      await store.set('foobar', 'nope');
    });

    expect(getByTestId('state').innerHTML).toContain('"foobar":"nope"');
  });
});


describe('render performance', () => {
  it('should only re-render when bound keys are triggered', async () => {
    const { store } = testSetup();
    let renderCount = 0;

    function WithHooks() {
      renderCount++;

      let { state, foobar } = useValstore(store, {
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

      let { state, foobar } = useValstore(store, {
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
