'use strict';

(() => {
  const content = window.PINKY_CONTENT;
  if (!content) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`;
  const categoryNames = {
    events: 'Events & Experiences',
    film: 'Film & Content',
    communications: 'Brand & Communications'
  };
  const credentialUrl = 'assets/Pinky-Lamb-Credential-2026.pdf';
  const pageSize = 4;
  const state = { filter: 'all', expanded: false };
  const projects = content.projects;
  const projectGrid = $('#project-grid');
  const loadProjects = $('#load-projects');
  const workCounter = $('#work-counter');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selectedInterests = new Set();
  let toastTimer;

  function showToast(message) {
    const toast = $('#toast');
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 7000);
  }

  // Project records and service copy are editable in content.js.
  function projectCard(project, index) {
    const title = escapeHtml(project.title);
    const client = escapeHtml(project.client);
    const category = escapeHtml(categoryNames[project.category]);
    return `<button type="button" class="project-card" data-project="${escapeHtml(project.id)}" aria-label="Xem dự án ${title} — ${client}, ${project.year}">
      <span class="project-media"><img src="assets/${escapeHtml(project.image)}.webp" alt="" loading="lazy" decoding="async" width="1104" height="620"><span class="project-image-index">${String(index + 1).padStart(2, '0')} / PINKY LAMB</span></span>
      <span class="project-meta"><span class="project-kicker">${client}<span>${project.year}</span></span><span class="project-title-row"><span class="project-title">${title}</span><span class="project-arrow">${icon('arrow')}</span></span><span class="project-category">${category}</span></span>
    </button>`;
  }

  function renderProjects() {
    const matching = projects.filter((project) => state.filter === 'all' || project.category === state.filter);
    const visible = state.expanded ? matching : matching.slice(0, pageSize);
    projectGrid.innerHTML = visible.map((project) => projectCard(project, projects.indexOf(project))).join('');
    workCounter.textContent = `${String(visible.length).padStart(2, '0')} / ${String(matching.length).padStart(2, '0')} PROJECTS`;
    loadProjects.hidden = matching.length <= pageSize;
    loadProjects.setAttribute('aria-expanded', String(state.expanded));
    loadProjects.setAttribute('aria-controls', 'project-grid');
    loadProjects.innerHTML = state.expanded ? `Thu gọn dự án ${icon('close')}` : `Xem thêm dự án ${icon('plus')}`;
  }

  $$('.filter').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      state.expanded = false;
      $$('.filter').forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle('is-active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      renderProjects();
    });
  });

  loadProjects.addEventListener('click', () => {
    state.expanded = !state.expanded;
    renderProjects();
    const target = state.expanded ? $$('.project-card', projectGrid)[pageSize] : $('.work-toolbar');
    if (target) {
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      if (state.expanded) target.focus({ preventScroll: true });
    }
  });

  const serviceList = $('#service-list');
  serviceList.innerHTML = content.services.map((service, index) => `<details class="service-item"${index === 0 ? ' open' : ''}>
    <summary><span class="service-number">${escapeHtml(service.number)}</span><span class="service-titles"><strong>${escapeHtml(service.title)}</strong><small>${escapeHtml(service.titleVi)}</small></span><span class="service-toggle">${icon('plus')}</span></summary>
    <div class="service-body"><p>${escapeHtml(service.summary)}</p><ul class="service-scope">${service.scope.map((scope) => `<li>${escapeHtml(scope)}</li>`).join('')}</ul></div>
  </details>`).join('');

  // Native dialogs provide focus containment, Escape handling, and an inert page.
  function openDialog(dialog) {
    if (typeof dialog.showModal !== 'function') return false;
    dialog.showModal();
    document.body.classList.add('dialog-open');
    return true;
  }

  $$('dialog').forEach((dialog) => {
    $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('dialog-open');
    });
  });

  function openProject(projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const dialog = $('#case-dialog');
    const gallery = [...new Set(project.gallery)].filter((name) => name !== project.image);
    const scope = project.scope.length ? `<div class="case-scope"><h3>HẠNG MỤC THỰC HIỆN</h3><ul>${project.scope.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : '';
    $('#case-content').innerHTML = `<img class="case-main-image" src="assets/${escapeHtml(project.image)}.webp" alt="${escapeHtml(project.title)} — ${escapeHtml(project.client)}" width="1104" height="620">
      <div class="case-body"><p class="case-eyebrow">${escapeHtml(project.client)} / ${escapeHtml(project.eyebrow)}</p><h2 id="case-title">${escapeHtml(project.title)}</h2>
      <div class="case-overview${project.scope.length ? '' : ' no-scope'}"><p>${escapeHtml(project.summary)}</p>${scope}</div>
      ${gallery.length ? `<div class="case-gallery">${gallery.map((name, index) => `<img src="assets/${escapeHtml(name)}.webp" loading="lazy" alt="${escapeHtml(project.title)} — hình ảnh ${index + 2}" width="1000" height="620">`).join('')}</div>` : ''}
      <div class="case-footer"><a href="${credentialUrl}#page=${project.sourcePage}" target="_blank" rel="noopener noreferrer">Credential 2026 · Trang ${project.sourcePage} ↗</a><button class="button button-dark" type="button" id="case-contact">Cùng tạo dự án của bạn ${icon('arrow')}</button></div></div>`;
    if (!openDialog(dialog)) {
      window.open(`${credentialUrl}#page=${project.sourcePage}`, '_blank', 'noopener');
      return;
    }
    dialog.scrollTop = 0;
    $('#case-contact').addEventListener('click', () => {
      const relatedService = { events: 'Events & Experiences', film: 'Film & Content Production', communications: 'Integrated Communications' }[project.category];
      selectInterest(relatedService, true);
      dialog.close();
      window.requestAnimationFrame(() => {
        const contactHeading = $('#contact-title');
        contactHeading.focus({ preventScroll: true });
        $('#contact').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  projectGrid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-project]');
    if (card) openProject(card.dataset.project);
  });

  const videoDialog = $('#video-dialog');
  const video = $('#showreel-video');
  $$('[data-showreel]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!openDialog(videoDialog)) {
        window.open('assets/showreel-2025.mp4', '_blank', 'noopener');
        return;
      }
      const playRequest = video.play();
      if (playRequest && typeof playRequest.catch === 'function') playRequest.catch(() => {});
    });
  });
  videoDialog.addEventListener('close', () => video.pause());

  // The mobile menu remains usable by keyboard and closes after navigation.
  const menuToggle = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  function closeMenu(restoreFocus = false) {
    mobileNav.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Mở menu');
    if (restoreFocus) menuToggle.focus();
  }
  menuToggle.addEventListener('click', () => {
    const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
    mobileNav.hidden = !opening;
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? 'Đóng menu' : 'Mở menu');
  });
  $$('a', mobileNav).forEach((link) => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true);
  });
  document.addEventListener('click', (event) => {
    if (!mobileNav.hidden && !event.target.closest('.site-header')) closeMenu();
  });
  const desktopMedia = window.matchMedia('(min-width: 1021px)');
  if (desktopMedia.addEventListener) desktopMedia.addEventListener('change', (event) => { if (event.matches) closeMenu(); });

  if ('IntersectionObserver' in window) {
    const sections = ['work', 'services', 'about', 'ip-studio'];
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $$('.desktop-nav a').forEach((link) => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-current', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-18% 0px -58% 0px' });
    sections.forEach((id) => navObserver.observe(document.getElementById(id)));
  }

  // Brief composition is entirely local. Only the visitor sends the email.
  const form = $('#brief-form');
  function selectInterest(name, selected) {
    if (!name) return;
    if (selected) selectedInterests.add(name);
    else selectedInterests.delete(name);
    $$('[data-service]').forEach((button) => button.setAttribute('aria-pressed', String(selectedInterests.has(button.dataset.service))));
  }
  $$('[data-service]').forEach((button) => {
    button.addEventListener('click', () => selectInterest(button.dataset.service, !selectedInterests.has(button.dataset.service)));
  });
  $$('[data-interest]').forEach((link) => {
    link.addEventListener('click', () => selectInterest(link.dataset.interest, true));
  });

  function briefData() {
    const data = new FormData(form);
    return {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      company: String(data.get('company') || '').trim(),
      brief: String(data.get('brief') || '').trim()
    };
  }
  function briefText(data) {
    return [
      'Chào Pinky Lamb,', '',
      `Tên: ${data.name}`,
      `Email: ${data.email}`,
      data.company ? `Thương hiệu / Công ty: ${data.company}` : '',
      selectedInterests.size ? `Dịch vụ quan tâm: ${[...selectedInterests].join(', ')}` : '',
      '', 'Ý tưởng / Brief:', data.brief, '',
      'Mong được trao đổi thêm cùng Pinky. Cảm ơn!'
    ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '').join('\n');
  }
  function showBriefFallback(text, focus = false) {
    $('#brief-fallback').hidden = false;
    const output = $('#brief-output');
    output.value = text;
    if (focus) { output.focus(); output.select(); }
  }
  function validateForm() {
    const nameField = form.elements.namedItem('name');
    const briefField = form.elements.namedItem('brief');
    nameField.setCustomValidity(nameField.value.trim() ? '' : 'Vui lòng nhập tên của bạn.');
    briefField.setCustomValidity(briefField.value.trim().length >= 10 ? '' : 'Bạn mô tả ý tưởng thêm một chút nhé (ít nhất 10 ký tự).');
    return form.reportValidity();
  }
  ['name', 'brief'].forEach((fieldName) => form.elements.namedItem(fieldName).addEventListener('input', (event) => event.target.setCustomValidity('')));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    const data = briefData();
    const text = briefText(data);
    const subject = `Project brief — ${data.company || data.name}`;
    const mailto = `mailto:pinkylamb.co@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    showBriefFallback(text);
    const link = document.createElement('a');
    link.href = mailto;
    document.body.append(link);
    link.click();
    link.remove();
    showToast('Đã chuẩn bị brief. Nếu ứng dụng email chưa mở, bạn có thể sao chép nội dung bên dưới.');
  });

  $('#copy-brief').addEventListener('click', async () => {
    if (!validateForm()) return;
    const text = briefText(briefData());
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      showToast('Đã sao chép brief. Bạn có thể dán vào email gửi đến pinkylamb.co@gmail.com.');
    } catch {
      showBriefFallback(text, true);
      showToast('Nội dung brief đã được chọn. Hãy sao chép và gửi đến pinkylamb.co@gmail.com.');
    }
  });

  renderProjects();
})();
