import {createCmsIcon} from './cms-icons.mjs';
/** CMS select-only combobox. Working values belong to callers, not this widget.
 * Programmatic loads are silent; only an actual user change emits `change`.
 * Dispose controls before replacing their host. The observer also prunes detached
 * controls, so a missed partial-render cleanup cannot retain document listeners. */
const managers = new WeakMap();
let nextId = 0;
const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').replace(/đ/g, 'd');

function managerFor(document) {
  let manager = managers.get(document);
  if (manager) return manager;
  manager = {controls: new Set(), opened: null, observer: null};
  manager.observer = new document.defaultView.MutationObserver(() => {
    for (const control of [...manager.controls]) {
      if (!control.element.isConnected) control.destroy();
      else control.reflect();
    }
  });
  manager.observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'inert', 'open', 'class', 'style']});
  managers.set(document, manager);
  return manager;
}

export function closePinkySelects(document = globalThis.document) {
  managers.get(document)?.opened?.close();
}

export function disposePinkySelects(root) {
  if (!root) return;
  const document = root.ownerDocument ?? root;
  for (const control of [...(managers.get(document)?.controls ?? [])]) {
    if (control.element === root || root.contains(control.element)) control.destroy();
  }
}

export function createPinkySelect(document, config = {}) {
  const window = document.defaultView;
  const manager = managerFor(document);
  const element = document.createElement('button');
  element.type = 'button';
  element.id = config.id || `pinky-select-${++nextId}`;
  element.className = 'ps-trigger';
  element.setAttribute('role', 'combobox');
  element.setAttribute('aria-haspopup', 'listbox');
  element.setAttribute('aria-expanded', 'false');
  element.setAttribute('aria-controls', `${element.id}-listbox`);
  if (config.label) element.setAttribute('aria-label', config.label);
  if (config.path) element.dataset.validationPath = config.path;
  if (config.describedBy) element.setAttribute('aria-describedby', config.describedBy);
  element.disabled = Boolean(config.disabled);
  const text = document.createElement('span');
  text.className = 'ps-value';
  const chevron = createCmsIcon('ChevronDown',{class:'ps-chevron'});
  element.append(text, chevron);
  let options = [], value = String(config.value ?? ''), lastLabel = '', active = -1;
  let popup = null, popupEvents = null, errorNode = null, ownsInvalid = false;
  let destroyed = false, typeBuffer = '', typeTime = 0;
  const life = new window.AbortController();

  function unavailable() {
    return destroyed || element.matches(':disabled') || Boolean(element.closest('[hidden],[inert]'));
  }
  function visible() {
    if (!element.isConnected || unavailable() || !element.getClientRects().length || window.getComputedStyle(element).visibility === 'hidden') return false;
    const modal = [...document.querySelectorAll('dialog[open]')].find(dialog => dialog.matches(':modal'));
    return !modal || modal.contains(element);
  }
  function renderValue() {
    const selected = options.find(option => option.value === value);
    if (selected) lastLabel = selected.label;
    text.textContent = selected ? selected.label : value === '' ? 'Chưa chọn' : `${lastLabel || value} — không còn trong danh sách`;
    element.dataset.value = value;
    if (popup) paint();
  }
  function reflect() {
    const disabled = String(element.matches(':disabled'));
    if (element.getAttribute('aria-disabled') !== disabled) element.setAttribute('aria-disabled', disabled);
    if (popup && !visible()) close();
  }
  function setValue(next) {
    if (destroyed) return;
    next = String(next ?? '');
    if (value !== next) lastLabel = '';
    value = next;
    renderValue();
  }
  function setOptions(next) {
    if (destroyed) return;
    close();
    options = next.map(option => ({value: String(option.value), label: String(option.label), disabled: Boolean(option.disabled)}));
    renderValue();
  }
  function setDisabled(disabled) {
    if (destroyed) return;
    element.disabled = Boolean(disabled);
    reflect();
  }
  function setError(message) {
    if (destroyed) return;
    const id = `${element.id}-pinky-error`;
    const descriptions = new Set((element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    if (message) {
      if (!errorNode) {errorNode = document.createElement('p');errorNode.id = id;errorNode.className = 'field-error ps-message';errorNode.setAttribute('role', 'alert');}
      errorNode.textContent = String(message);
      element.after(errorNode);
      descriptions.add(id);
      ownsInvalid = element.getAttribute('aria-invalid') !== 'true' || ownsInvalid;
      element.setAttribute('aria-invalid', 'true');
    } else {
      errorNode?.remove();errorNode = null;descriptions.delete(id);
      if (ownsInvalid) element.removeAttribute('aria-invalid');
      ownsInvalid = false;
    }
    if (descriptions.size) element.setAttribute('aria-describedby', [...descriptions].join(' '));
    else element.removeAttribute('aria-describedby');
  }
  function nextEnabled(start, direction) {
    for (let step = 1; step <= options.length; step++) {
      const index = (start + direction * step + options.length * 2) % options.length;
      if (!options[index].disabled) return index;
    }
    return -1;
  }
  function paint() {
    if (!popup) return;
    [...popup.children].forEach((row, index) => {
      row.setAttribute('aria-selected', String(options[index].value === value));
      row.classList.toggle('is-active', index === active);
    });
    if (active >= 0) element.setAttribute('aria-activedescendant', `${element.id}-option-${active}`);
  }
  function ensureVisible() {
    const row = popup?.children[active];
    if (!row) return;
    if (row.offsetTop < popup.scrollTop) popup.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > popup.scrollTop + popup.clientHeight) popup.scrollTop = row.offsetTop + row.offsetHeight - popup.clientHeight;
  }
  function position() {
    if (!popup) return;
    if (!visible()) {close();return;}
    const rect = element.getBoundingClientRect(), viewport = window.visualViewport;
    const left = (viewport?.offsetLeft || 0) + 12, top = (viewport?.offsetTop || 0) + 12;
    const right = left + (viewport?.width || window.innerWidth) - 24;
    let bottom = top + (viewport?.height || window.innerHeight) - 24;
    const bar = document.querySelector('[data-cms-action-bar]');
    if (bar?.getClientRects().length) bottom = Math.min(bottom, bar.getBoundingClientRect().top - 8);
    if (rect.bottom < top || rect.top > bottom) {close();return;}
    const width = Math.max(1, Math.min(right - left, Math.max(rect.width, 240)));
    popup.style.width = `${width}px`;
    popup.style.left = `${Math.max(left, Math.min(rect.left, right - width))}px`;
    const below = Math.max(0, bottom - rect.bottom - 6), above = Math.max(0, rect.top - top - 6);
    const natural = Math.min(popup.scrollHeight, 360), upward = below < natural && above > below;
    const height = Math.min(360, upward ? above : below);
    popup.style.maxHeight = `${Math.max(1, height)}px`;
    popup.style.top = `${upward ? Math.max(top, rect.top - 6 - Math.min(popup.scrollHeight, height)) : rect.bottom + 6}px`;
    popup.dataset.placement = upward ? 'top' : 'bottom';
    ensureVisible();
  }
  function close() {
    popupEvents?.abort();popupEvents = null;
    popup?.remove();popup = null;
    element.setAttribute('aria-expanded', 'false');element.removeAttribute('aria-activedescendant');
    typeBuffer = '';typeTime = 0;
    if (manager.opened === controller) manager.opened = null;
  }
  function commit() {
    if (!popup || !visible() || active < 0 || options[active]?.disabled) {close();return;}
    const next = options[active].value, changed = next !== value;
    setValue(next);close();
    if (changed && !destroyed) element.dispatchEvent(new window.Event('change', {bubbles: true}));
  }
  function open() {
    if (!visible()) return;
    closePinkySelects(document);
    active = options.findIndex(option => option.value === value && !option.disabled);
    if (active < 0) active = nextEnabled(-1, 1);
    if (active < 0) return;
    manager.opened = controller;
    popup = document.createElement('div');popup.id = `${element.id}-listbox`;popup.className = 'ps-popup';popup.setAttribute('role', 'listbox');
    if (config.label) popup.setAttribute('aria-label', config.label);
    else if (element.labels?.length) popup.setAttribute('aria-label', [...element.labels].map(label => label.textContent).join(' '));
    options.forEach((option, index) => {
      const row = document.createElement('div');row.id = `${element.id}-option-${index}`;row.className = 'ps-option';row.dataset.index = String(index);row.dataset.optionValue = option.value;
      row.setAttribute('role', 'option');row.setAttribute('aria-disabled', String(option.disabled));
      const label = document.createElement('span');label.className = 'ps-option-text';label.textContent = option.label;
      const check = document.createElement('span');check.className = 'ps-option-check';check.append(createCmsIcon('Check'));check.setAttribute('aria-hidden', 'true');
      row.append(label, check);popup.append(row);
    });
    // A modal dialog is in the browser top layer; its popup must be a descendant.
    (element.closest('dialog[open],[role="dialog"][aria-modal="true"]') || document.body).append(popup);
    element.setAttribute('aria-expanded', 'true');
    popupEvents = new window.AbortController();const signal = popupEvents.signal;
    popup.addEventListener('pointerdown', event => event.preventDefault(), {signal});
    popup.addEventListener('click', event => {
      const row = event.target.closest('[role=option]');
      if (!popup?.contains(row) || !visible()) return;
      const index = Number(row.dataset.index);
      if (!options[index] || options[index].disabled) return;
      active = index;commit();
      if (!destroyed && element.isConnected) element.focus({preventScroll: true});
    }, {signal});
    document.addEventListener('pointerdown', event => {if (!element.contains(event.target) && !popup?.contains(event.target)) close();}, {capture: true, signal});
    document.addEventListener('scroll', event => {if (!popup?.contains(event.target)) position();}, {capture: true, signal});
    window.addEventListener('resize', position, {signal});
    window.visualViewport?.addEventListener('resize', position, {signal});
    window.visualViewport?.addEventListener('scroll', position, {signal});
    paint();position();ensureVisible();
  }
  function move(direction) {active = nextEnabled(active, direction);paint();ensureVisible();}
  function keydown(event) {
    if (unavailable()) return;
    const key = event.key;
    if (key === 'Tab') {if (popup) commit();return;}
    if (key === 'Escape') {if (popup) {event.preventDefault();event.stopPropagation();close();}return;}
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();const wasOpen = Boolean(popup);
      if (!wasOpen) open();
      if (!popup) return;
      if ((key === 'Enter' || key === ' ') && wasOpen) commit();
      else if (key === 'ArrowDown') move(1);
      else if (key === 'ArrowUp') move(-1);
      else if (key === 'Home' || key === 'End') {active = nextEnabled(key === 'End' ? 0 : -1, key === 'End' ? -1 : 1);paint();ensureVisible();}
      return;
    }
    if (key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    event.preventDefault();if (!popup) open();if (!popup) return;
    const now = Date.now();typeBuffer = now - typeTime > 700 ? '' : typeBuffer;typeTime = now;typeBuffer += key;
    let prefix = [...typeBuffer].every(character => character === typeBuffer[0]) ? key : typeBuffer;
    function find(needle) {for (let step = 1; step <= options.length; step++) {const index = (active + step + options.length) % options.length;if (!options[index].disabled && normalize(options[index].label).startsWith(normalize(needle))) return index;}return -1;}
    let index = find(prefix);
    if (index < 0 && typeBuffer.length > 1) {typeBuffer = key;prefix = key;index = find(prefix);}
    if (index >= 0) {active = index;paint();ensureVisible();}
  }
  function destroy() {
    if (destroyed) return;
    close();destroyed = true;life.abort();errorNode?.remove();
    manager.controls.delete(controller);
    delete element.pinkySelect;delete element.value;
    if (!manager.controls.size) {manager.observer.disconnect();managers.delete(document);}
  }
  const controller = {element, setValue, setOptions, setDisabled, setError, close, destroy, reflect};
  Object.defineProperty(element, 'value', {configurable: true, get: () => value, set: setValue});
  element.pinkySelect = controller;manager.controls.add(controller);
  element.addEventListener('click', () => {if (!unavailable()) popup ? close() : open();}, {signal: life.signal});
  element.addEventListener('keydown', keydown, {signal: life.signal});
  element.addEventListener('blur', close, {signal: life.signal});
  setOptions(config.options ?? []);reflect();
  // Factories mount synchronously. Bound cleanup also covers never-mounted controls.
  window.queueMicrotask(() => {if (!destroyed && !element.isConnected) destroy();});
  return element;
}
