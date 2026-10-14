const enhancedRoots = new WeakSet();

function button(document, label, className = '') {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = label;
  return node;
}

function dialogShell(document, id, label) {
  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = id === 'site-case-dialog' ? 'case-dialog' : 'video-dialog';
  dialog.setAttribute('aria-label', label);
  const toolbar = document.createElement('div');
  toolbar.className = 'dialog-toolbar';
  const title = document.createElement('span');
  title.textContent = label;
  const close = button(document, 'Đóng', 'dialog-close');
  close.setAttribute('aria-label', 'Đóng');
  toolbar.append(title, close);
  dialog.append(toolbar);
  close.addEventListener('click', () => dialog.close());
  return {dialog, close, title};
}

function enhanceMenu(root, document) {
  const menu = root.querySelector('#mobile-menu');
  if (!menu) return;
  const toggle = menu.querySelector('summary');
  if (!toggle) return;
  const close = (restoreFocus = false) => {
    menu.open = false;
    if (restoreFocus) toggle.focus();
  };
  menu.addEventListener('toggle', () => toggle.setAttribute('aria-expanded', String(menu.open)));
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { event.preventDefault(); close(true); }
  });
  for (const link of menu.querySelectorAll('a[href]')) link.addEventListener('click', () => close());
  document.addEventListener('click', event => { if (menu.open && !menu.contains(event.target)) close(); });
  const desktop = document.defaultView.matchMedia('(min-width:1021px)');
  desktop.addEventListener('change', event => { if (event.matches) close(); });
  if (desktop.matches) close();
  toggle.setAttribute('aria-expanded', String(menu.open));
}

function enhanceProjects(root, document) {
  const grid = root.querySelector('#project-grid');
  if (!grid) return;
  const projects = [...grid.querySelectorAll('details.project-card[data-project-id]')];
  const initial = Number(grid.dataset.initialVisibleCount);
  if (!Number.isInteger(initial) || initial < 1) return;
  const filterNodes = [...root.querySelectorAll('.filters [data-filter]')];
  const filters = filterNodes.map(node => {
    const control = button(document, node.textContent, node.className);
    control.dataset.filter = node.dataset.filter;
    node.replaceWith(control);
    return control;
  });
  const more = button(document, 'Xem thêm dự án', 'button button-dark');
  more.id = 'load-more';
  const moreContainer = root.querySelector('.work-more');
  if (moreContainer) moreContainer.prepend(more);
  const counter = root.querySelector('#work-counter');
  if (counter) counter.setAttribute('aria-live', 'polite');
  let category = 'all', expanded = false;
  const update = () => {
    const matching = projects.filter(project => category === 'all' || project.dataset.category === category);
    const visible = new Set(expanded ? matching : matching.slice(0, initial));
    for (const project of projects) project.hidden = !visible.has(project);
    for (const filter of filters) {
      const active = filter.dataset.filter === category;
      filter.classList.toggle('is-active', active);
      filter.setAttribute('aria-pressed', String(active));
    }
    if (counter) counter.textContent = `${String(visible.size).padStart(2, '0')} / ${String(matching.length).padStart(2, '0')} PROJECTS`;
    more.hidden = matching.length <= initial;
    more.setAttribute('aria-expanded', String(expanded));
    more.setAttribute('aria-controls', 'project-grid');
    more.textContent = expanded ? 'Thu gọn dự án' : 'Xem thêm dự án';
  };
  for (const filter of filters) filter.addEventListener('click', () => { category = filter.dataset.filter; expanded = false; update(); });
  more.addEventListener('click', () => { expanded = !expanded; update(); });

  // showModal provides native focus containment. Keep the details fallback if unavailable.
  if (typeof document.defaultView.HTMLDialogElement?.prototype.showModal === 'function') {
    const shell = dialogShell(document, 'site-case-dialog', 'Chi tiết dự án');
    document.body.append(shell.dialog);
    let trigger, body, cover, handoff;
    shell.dialog.addEventListener('close', () => {
      const destination = handoff?.isConnected ? handoff : trigger;
      if (handoff?.isConnected) root.querySelector('#brief-form')?.scrollIntoView({block: 'start'});
      handoff = null;
      if (destination?.isConnected) destination.focus();
    });
    for (const project of projects) {
      const summary = project.querySelector('summary'), original = project.querySelector('.case-body');
      if (!summary || !original) continue;
      const open = event => {
        event.preventDefault();
        body?.remove();
        cover?.remove();
        handoff = null;
        body = original.cloneNode(true);
        body.hidden = false;
        for (const node of [body, ...body.querySelectorAll('[id]')]) node.removeAttribute('id');
        const name = project.querySelector('.project-title')?.textContent ?? 'Chi tiết dự án';
        shell.title.textContent = name;
        shell.dialog.setAttribute('aria-label', name);
        const originalCover = project.querySelector('.project-media img');
        cover = originalCover?.cloneNode(true);
        if (cover) {
          cover.removeAttribute('id');
          cover.classList.add('case-main-image');
          shell.dialog.append(cover);
        }
        const interest = button(document, 'Cùng tạo dự án của bạn', 'button button-dark');
        interest.id = 'case-interest';
        interest.addEventListener('click', () => {
          let ids = [];
          try { ids = JSON.parse(project.dataset.serviceIds); } catch { /* A malformed public hook selects nothing. */ }
          const selected = new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []);
          for (const input of root.querySelectorAll('#interest-options input[data-service]')) if (selected.has(input.dataset.service)) input.checked = true;
          handoff = root.querySelector('#brief-form input[name="name"]');
          shell.dialog.close();
        });
        body.append(interest);
        shell.dialog.append(body);
        trigger = summary;
        shell.dialog.showModal();
        shell.close.focus();
      };
      summary.setAttribute('aria-haspopup', 'dialog');
      summary.addEventListener('click', open);
      summary.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') open(event); });
      project.classList.add('case-enhanced');
    }
  }
  update();
}

function enhanceReel(root, document) {
  const video = root.querySelector('#showreel-video');
  if (!video || typeof document.defaultView.HTMLDialogElement?.prototype.showModal !== 'function') return;
  const shell = dialogShell(document, 'site-reel-dialog', video.getAttribute('aria-label') ?? 'Showreel');
  const status = document.createElement('p');
  status.className = 'reel-status';
  status.setAttribute('role', 'status');
  shell.dialog.append(status);
  document.body.append(shell.dialog);
  const originalParent = video.parentNode, originalNext = video.nextSibling;
  let trigger;
  shell.dialog.addEventListener('close', () => {
    video.pause();
    originalParent.insertBefore(video, originalNext?.parentNode === originalParent ? originalNext : null);
    if (trigger?.isConnected) trigger.focus();
  });
  for (const link of root.querySelectorAll('a[href="#showreel"]')) {
    link.addEventListener('click', event => {
      event.preventDefault();
      trigger = link;
      status.textContent = '';
      shell.dialog.insertBefore(video, status);
      shell.dialog.showModal();
      shell.close.focus();
      const playing = video.play();
      playing?.catch(() => { status.textContent = 'Bạn có thể bấm phát để xem showreel.'; });
    });
  }
}

function enhanceBrief(root, document) {
  const form = root.querySelector('form#brief-form');
  if (!form || !form.getAttribute('action')?.startsWith('mailto:')) return;
  const recipient = form.getAttribute('action').slice(7);
  const field = name => form.elements.namedItem(name);
  const name = field('name'), email = field('email'), brief = field('brief'), company = field('company');
  if (![name, email, brief, company].every(value => value && 'value' in value)) return;
  const status = document.createElement('p');
  status.id = 'brief-status';
  status.setAttribute('role', 'status');
  const fallback = document.createElement('div');
  fallback.id = 'brief-fallback';
  fallback.hidden = true;
  const label = document.createElement('label');
  label.textContent = 'Nội dung brief để sao chép';
  const output = document.createElement('textarea');
  output.id = 'brief-copy-text';
  output.readOnly = true;
  output.rows = 12;
  label.append(output);
  fallback.append(label);
  form.append(status, fallback);
  const validate = () => {
    name.setCustomValidity(name.value.trim() ? '' : 'Vui lòng nhập tên của bạn.');
    brief.setCustomValidity(brief.value.trim().length >= 10 ? '' : 'Bạn mô tả ý tưởng thêm một chút nhé (ít nhất 10 ký tự).');
    email.setCustomValidity(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? '' : 'Vui lòng nhập email hợp lệ.');
    return form.reportValidity();
  };
  for (const input of [name, email, brief]) input.addEventListener('input', () => input.setCustomValidity(''));
  const text = () => {
    const interests = [...form.querySelectorAll('input[name="interests"][data-service]:checked')].map(input => input.value);
    return ['Chào Pinky Lamb,', '', `Tên: ${name.value.trim()}`, `Email: ${email.value.trim()}`, ...(company.value.trim() ? [`Thương hiệu / Công ty: ${company.value.trim()}`] : []), ...(interests.length ? [`Dịch vụ quan tâm: ${interests.join(', ')}`] : []), '', 'Ý tưởng / Brief:', brief.value.trim(), '', 'Mong được trao đổi thêm cùng Pinky. Cảm ơn!'].join('\n');
  };
  const readable = (value, select = false) => {
    output.value = value;
    fallback.hidden = false;
    if (select) { output.focus(); output.select(); }
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validate()) return;
    const value = text();
    readable(value);
    const link = document.createElement('a');
    link.href = `mailto:${recipient}?subject=${encodeURIComponent(`Project brief — ${company.value.trim() || name.value.trim()}`)}&body=${encodeURIComponent(value)}`;
    document.body.append(link);
    link.click();
    link.remove();
    status.textContent = `Đã chuẩn bị brief. Nếu ứng dụng email chưa mở, hãy sao chép nội dung và gửi đến ${recipient}.`;
  });
  const copy = form.querySelector('#copy-brief');
  if (copy) {
    copy.disabled = false;
    copy.addEventListener('click', async () => {
      if (!validate()) return;
      const value = text();
      readable(value);
      try {
        if (!document.defaultView.isSecureContext || !document.defaultView.navigator.clipboard) throw new Error('Clipboard unavailable');
        await document.defaultView.navigator.clipboard.writeText(value);
        status.textContent = `Đã sao chép brief. Bạn có thể gửi đến ${recipient}.`;
      } catch {
        readable(value, true);
        status.textContent = `Nội dung brief đã được chọn. Hãy sao chép và gửi đến ${recipient}.`;
      }
    });
  }
}

export function enhanceSite(root = document) {
  if (enhancedRoots.has(root)) return;
  const owner = root.nodeType === 9 ? root : root.ownerDocument;
  if (!owner?.defaultView) return;
  enhancedRoots.add(root);
  enhanceMenu(root, owner);
  enhanceProjects(root, owner);
  enhanceReel(root, owner);
  enhanceBrief(root, owner);
  owner.documentElement.classList.add('site-enhanced');
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhanceSite(), {once: true});
  else enhanceSite();
}
