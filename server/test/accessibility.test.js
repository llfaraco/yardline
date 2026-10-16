import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(process.cwd(), '..', 'yardline-app');

function hexToLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16) / 255);
  const a = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

test('Accessibility (WCAG 2.1 AA) - Skip to main content link', () => {
  const html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  assert.ok(html.includes('class="skip-link"'), 'index.html must have a skip-link');
  assert.ok(html.includes('href="#stage-title"'), 'skip-link must point to #stage-title');
});

test('Accessibility (WCAG 2.1 AA) - Modal dialog roles and aria attributes', () => {
  const html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  const requiredModals = [
    'article-reader-modal',
    'player-modal',
    'onboarding-modal',
    'lineup-swap-modal',
    'waiver-modal',
    'checkout-modal',
    'manager-dna-modal'
  ];

  requiredModals.forEach(modalId => {
    const modalTagRegex = new RegExp(`id="${modalId}"[^>]*role="dialog"`, 'i');
    const ariaModalRegex = new RegExp(`id="${modalId}"[^>]*aria-modal="true"`, 'i');
    assert.ok(modalTagRegex.test(html), `Modal #${modalId} must have role="dialog"`);
    assert.ok(ariaModalRegex.test(html), `Modal #${modalId} must have aria-modal="true"`);
  });
});

test('Accessibility (WCAG 2.1 AA) - Focus-visible ring and outline defined in CSS', () => {
  const css = fs.readFileSync(path.join(APP_DIR, 'css', 'styles.css'), 'utf8');
  assert.ok(css.includes(':focus-visible'), 'CSS must define :focus-visible rules');
  assert.ok(css.includes('outline: 2px solid'), 'CSS must have at least 2px solid focus outline');
  assert.ok(css.includes('.skip-link'), 'CSS must style .skip-link');
});

test('Accessibility (WCAG 2.1 AA) - Touch target minimums for mobile viewports (44px)', () => {
  const css = fs.readFileSync(path.join(APP_DIR, 'css', 'styles.css'), 'utf8');
  assert.ok(css.includes('min-height: 44px;'), 'CSS must enforce 44px min-height for touch targets');
});

test('Accessibility (WCAG 2.1 AA) - Zero unicode emojis across all frontend files', () => {
  const files = [
    path.join(APP_DIR, 'index.html'),
    path.join(APP_DIR, 'css', 'styles.css'),
    path.join(APP_DIR, 'js', 'engines.js'),
    path.join(APP_DIR, 'js', 'data_and_views.js')
  ];

  files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    for (const ch of content) {
      const code = ch.codePointAt(0);
      const isEmoji = (code >= 0x1F300 && code <= 0x1FAFF) || (code >= 0x2310 && code <= 0x23FF) || (code >= 0x2600 && code <= 0x27BF);
      assert.ok(!isEmoji, `Found emoji [U+${code.toString(16).toUpperCase()}] in ${path.basename(f)}`);
    }
  });
});

test('Accessibility (WCAG 2.1 AA) - Badge color contrast ratios >= 4.5:1', () => {
  const badgePairs = [
    { name: 'badge-crimson', bg: '#fee2e2', fg: '#b91c1c' },
    { name: 'badge-navy', bg: '#e2e8f0', fg: '#0f172a' },
    { name: 'badge-blue', bg: '#dbeafe', fg: '#1d4ed8' },
    { name: 'badge-green', bg: '#dcfce7', fg: '#15803d' },
    { name: 'badge-amber', bg: '#fef3c7', fg: '#b45309' },
    { name: 'badge-fa', bg: '#d1fae5', fg: '#065f46' },
    { name: 'badge-waiver', bg: '#dbeafe', fg: '#1e40af' },
    { name: 'badge-trade', bg: '#fef3c7', fg: '#92400e' },
    { name: 'badge-system', bg: '#fee2e2', fg: '#991b1b' },
    { name: 'badge-official', bg: '#dcfce7', fg: '#166534' },
    { name: 'badge-derived', bg: '#e0f2fe', fg: '#0369a1' },
    { name: 'badge-sim', bg: '#fef3c7', fg: '#92400e' },
    { name: 'badge-unavail', bg: '#f1f5f9', fg: '#475569' },
    { name: 'badge-healthy', bg: '#f0fdf4', fg: '#15803d' },
    { name: 'badge-q', bg: '#fffbeb', fg: '#b45309' },
    { name: 'badge-out', bg: '#fee2e2', fg: '#b91c1c' },
    { name: 'badge-ir', bg: '#7f1d1d', fg: '#ffffff' }
  ];

  badgePairs.forEach(pair => {
    const ratio = contrastRatio(pair.bg, pair.fg);
    assert.ok(ratio >= 4.5, `${pair.name} contrast ratio ${ratio.toFixed(2)}:1 must be >= 4.5:1`);
  });
});

test('Accessibility (WCAG 2.1 AA) - Keyboard focus trap and Escape handler present in scripts', () => {
  const js = fs.readFileSync(path.join(APP_DIR, 'js', 'data_and_views.js'), 'utf8');
  assert.ok(js.includes('function openModal(id)'), 'openModal function must be present');
  assert.ok(js.includes('function closeModal(id)'), 'closeModal function must be present');
  assert.ok(js.includes('e.key === "Escape"'), 'Escape key handler must be implemented');
  assert.ok(js.includes('e.key === "Tab"'), 'Tab key focus trap must be implemented');
});
