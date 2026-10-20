import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = fs.readFileSync(new URL('../../yardline-app/index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../../yardline-app/js/visual-shell.js', import.meta.url), 'utf8');
function shell(t, mobile = true) {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, { url: 'http://127.0.0.1:3002/', runScripts: 'outside-only', virtualConsole });
  dom.window.matchMedia = () => ({ matches: mobile, addEventListener() {} });
  dom.window.eval(source);
  t.after(() => { dom.window.close(); assert.deepEqual(errors, [], 'shell must not emit uncaught errors'); });
  return dom.window;
}

test('mobile navigation opens, closes with Escape, restores focus and preserves every destination', t => {
  const w = shell(t), d = w.document;
  const button = d.getElementById('yl-menu-toggle'), navigation = d.getElementById('yl-main-navigation');
  assert.equal(navigation.inert, true);
  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(navigation.inert, false);
  assert.equal(d.getElementById('yl-nav-backdrop').hidden, false);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(d.activeElement, button);
  assert.equal(navigation.inert, true);
  for (const tab of ['home', 'players', 'playbook', 'league', 'waivers', 'trade', 'rankings', 'teams']) {
    assert.ok(navigation.querySelector(`[data-tab="${tab}"]`), tab);
  }
  button.click();
  navigation.querySelector('[data-tab="players"]').click();
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(d.activeElement.id, 'stage-title');
});

test('search shortcut respects text entry and open dialogs; desktop navigation remains accessible', t => {
  const w = shell(t, false), d = w.document;
  assert.equal(d.getElementById('yl-main-navigation').inert, false);
  d.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
  assert.equal(d.activeElement.id, 'global-omni-search');
  d.getElementById('stage-title').focus();
  d.getElementById('player-modal').classList.add('open');
  d.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
  assert.equal(d.activeElement.id, 'stage-title');
  d.getElementById('player-modal').classList.remove('open');
  const input = d.createElement('textarea'); d.body.append(input); input.focus();
  input.dispatchEvent(new w.KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
  assert.equal(d.activeElement, input);
});
