/* Interaction for the app shell; feature modules keep their existing contracts. */
(() => {
  const toggle = document.getElementById('yl-menu-toggle');
  const navigation = document.getElementById('yl-main-navigation');
  const backdrop = document.getElementById('yl-nav-backdrop');
  if (!toggle || !navigation || !backdrop) return;
  const mobile = window.matchMedia('(max-width: 900px)');

  function setOpen(open, restoreFocus = true) {
    document.body.classList.toggle('yl-nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação');
    backdrop.hidden = !open;
    navigation.inert = mobile.matches && !open;
    if (open) navigation.querySelector('button')?.focus();
    else if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  backdrop.addEventListener('click', () => setOpen(false));
  navigation.addEventListener('click', event => {
    if (mobile.matches && event.target.closest('[data-tab]')) {
      setOpen(false, false);
      document.getElementById('stage-title')?.focus({ preventScroll: true });
    }
  });
  navigation.addEventListener('keydown', event => {
    const action = event.target.closest?.('[role="button"]');
    if (action && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      action.click();
    }
  });
  document.addEventListener('keydown', event => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (event.key === 'Escape' && isOpen) setOpen(false);
    if (event.key === 'Tab' && isOpen) {
      const targets = [toggle, ...navigation.querySelectorAll('button, a[href], [tabindex="0"]')]
        .filter(element => element.getClientRects().length);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    const editing = event.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if (event.key === '/' && !editing && !isOpen && !document.querySelector('.yl-modal-overlay.open')) {
      event.preventDefault();
      document.getElementById('global-omni-search')?.focus();
    }
  });
  mobile.addEventListener('change', () => setOpen(false, false));
  setOpen(false, false);
  document.querySelector('.fp-rail-item.active')?.setAttribute('aria-current', 'page');
})();
