(function () {
  'use strict';
  var deck = null, current = 0, listeners = [], touch = null;
  var stage = document.getElementById('development-stage');
  var outline = document.getElementById('development-outline');
  var previous = document.getElementById('development-previous');
  var next = document.getElementById('development-next');
  var fullscreen = document.getElementById('development-fullscreen');
  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }
  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    listeners.push(function () { target.removeEventListener(name, handler, options); });
  }
  function goTo(id) {
    if (!deck) return;
    for (var i = 0; i < deck.slides.length; i++) if (deck.slides[i].id === id) { show(i); return; }
  }
  function renderMap(slide) {
    var wrapper = element('div', 'architecture-wrap');
    var diagram = element('div', 'architecture-map');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1000 620'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M170 75H500H830M170 230H500H830M500 230V400H170M500 400H830M500 400V550');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', '#b1b1b0'); path.setAttribute('stroke-width', '2');
    svg.appendChild(path); diagram.appendChild(svg);
    for (var i = 0; i < slide.components.length; i++) {
      (function (component) {
        var button = element('button', 'architecture-node node-' + component.slot);
        button.type = 'button';
        button.appendChild(element('span', 'node-category', component.category));
        button.appendChild(element('strong', '', component.title));
        button.appendChild(element('span', 'node-description', component.description));
        if (component.services) {
          var services = element('span', 'node-services');
          for (var j = 0; j < component.services.length; j++) services.appendChild(element('span', '', component.services[j]));
          button.appendChild(services);
        }
        button.appendChild(element('span', 'node-action', 'Ver detalle'));
        button.onclick = function () { goTo(component.target); };
        diagram.appendChild(button);
      }(slide.components[i]));
    }
    wrapper.appendChild(diagram); wrapper.appendChild(element('p', 'diagram-caption', slide.caption));
    return wrapper;
  }
  function renderFlow(flow) {
    var wrapper = element('section', 'functional-flow');
    wrapper.setAttribute('aria-label', flow.title);
    wrapper.appendChild(element('h2', 'section-label', flow.title));
    var list = element('ol', 'flow-steps');
    for (var i = 0; i < flow.steps.length; i++) {
      var step = element('li', 'flow-step');
      step.appendChild(element('strong', '', flow.steps[i].title));
      step.appendChild(element('span', '', flow.steps[i].text)); list.appendChild(step);
    }
    wrapper.appendChild(list); return wrapper;
  }
  function renderPanels(panels) {
    var container = element('div', 'development-panels');
    for (var i = 0; i < panels.length; i++) {
      var panel = element('section', 'development-panel');
      if (panels[i].label) panel.appendChild(element('p', 'panel-label', panels[i].label));
      panel.appendChild(element('h2', '', panels[i].title));
      if (panels[i].body) panel.appendChild(element('p', 'panel-body', panels[i].body));
      if (panels[i].items) {
        var list = element('ul', 'panel-list');
        for (var j = 0; j < panels[i].items.length; j++) list.appendChild(element('li', '', panels[i].items[j]));
        panel.appendChild(list);
      }
      container.appendChild(panel);
    }
    return container;
  }
  function renderTable(table) {
    var wrapper = element('div', 'development-table-wrap');
    var node = element('table', 'development-table');
    var caption = element('caption', 'sr-only', table.title); node.appendChild(caption);
    var head = element('thead'), row = element('tr');
    for (var i = 0; i < table.headers.length; i++) { var th = element('th', '', table.headers[i]); th.scope = 'col'; row.appendChild(th); }
    head.appendChild(row); node.appendChild(head); var body = element('tbody');
    for (var r = 0; r < table.rows.length; r++) {
      var bodyRow = element('tr');
      for (var c = 0; c < table.rows[r].length; c++) {
        var cell = element(c === 0 ? 'th' : 'td', '', table.rows[r][c]);
        if (c === 0) cell.scope = 'row'; bodyRow.appendChild(cell);
      }
      body.appendChild(bodyRow);
    }
    node.appendChild(body); wrapper.appendChild(node); return wrapper;
  }
  function renderSteps(steps) {
    var list = element('ol', 'development-phases');
    for (var i = 0; i < steps.length; i++) {
      var item = element('li', 'development-phase');
      var heading = element('div', 'phase-heading');
      heading.appendChild(element('span', 'phase-number', String(i + 1)));
      heading.appendChild(element('h2', '', steps[i].title)); item.appendChild(heading);
      item.appendChild(element('p', '', steps[i].text));
      item.appendChild(element('p', 'phase-evidence', steps[i].evidence)); list.appendChild(item);
    }
    return list;
  }
  function show(index) {
    if (!deck) return;
    current = Math.max(0, Math.min(deck.slides.length - 1, index));
    var slide = deck.slides[current]; stage.textContent = '';
    var article = element('article', 'development-slide layout-' + slide.layout);
    var header = element('header', 'slide-heading');
    header.appendChild(element('p', 'eyebrow', slide.eyebrow || slide.label));
    header.appendChild(element('h1', '', slide.title));
    header.appendChild(element('p', 'slide-intro', slide.intro)); article.appendChild(header);
    if (slide.layout === 'architecture') article.appendChild(renderMap(slide));
    if (slide.flow) article.appendChild(renderFlow(slide.flow));
    if (slide.panels) article.appendChild(renderPanels(slide.panels));
    if (slide.table) article.appendChild(renderTable(slide.table));
    if (slide.steps) article.appendChild(renderSteps(slide.steps));
    if (slide.note) {
      var note = element('aside', 'development-note');
      note.appendChild(element('strong', '', slide.note.title)); note.appendChild(element('span', '', slide.note.text)); article.appendChild(note);
    }
    stage.appendChild(article); stage.scrollTop = 0;
    document.getElementById('development-counter').textContent = (current + 1) + ' / ' + deck.slides.length;
    document.getElementById('development-progress').style.width = ((current + 1) / deck.slides.length * 100) + '%';
    previous.disabled = current === 0; next.disabled = current === deck.slides.length - 1;
    var buttons = outline.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute('aria-current', i === current ? 'page' : 'false');
    if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#desarrollo/' + slide.id);
    document.title = slide.title + ' — SenNet E²S'; stage.focus();
  }
  function fullscreenChanged() {
    fullscreen.textContent = (document.fullscreenElement || document.webkitFullscreenElement) ? 'Salir de pantalla completa' : 'Pantalla completa';
  }
  function toggleFullscreen() {
    try {
      var active = document.fullscreenElement || document.webkitFullscreenElement;
      var target = active ? document : document.documentElement;
      var method = active ? (document.exitFullscreen || document.webkitExitFullscreen) : (target.requestFullscreen || target.webkitRequestFullscreen);
      if (!method) throw new Error('unsupported');
      var result = method.call(target);
      if (result && result.catch) result.catch(function () { document.getElementById('announcement').textContent = 'Este navegador no permite activar la pantalla completa.'; });
    } catch (_error) { document.getElementById('announcement').textContent = 'Este navegador no permite activar la pantalla completa.'; }
  }
  function close() {
    for (var i = 0; i < listeners.length; i++) listeners[i](); listeners = [];
    deck = null; touch = null; stage.textContent = ''; outline.textContent = '';
    document.getElementById('development-deck-title').textContent = '';
    document.getElementById('development-counter').textContent = '';
    previous.onclick = null; next.onclick = null; fullscreen.onclick = null;
    document.getElementById('development-map').onclick = null;
  }
  function validate(data) {
    if (!data || data.version !== 1 || typeof data.title !== 'string' || !Array.isArray(data.slides) || !data.slides.length || data.slides.length > 80) throw new Error('invalid');
    var ids = {};
    for (var i = 0; i < data.slides.length; i++) {
      var slide = data.slides[i];
      if (!/^[a-z0-9-]+$/.test(slide.id) || ids[slide.id] || typeof slide.title !== 'string' || typeof slide.label !== 'string' || typeof slide.intro !== 'string' || ['architecture', 'detail', 'table', 'phases'].indexOf(slide.layout) < 0) throw new Error('invalid');
      ids[slide.id] = true;
      if (slide.layout === 'architecture' && !Array.isArray(slide.components)) throw new Error('invalid');
    }
    for (var s = 0; s < data.slides.length; s++) {
      var components = data.slides[s].components || [];
      for (var c = 0; c < components.length; c++) if (!ids[components[c].target] || ['cpu', 'spe', 'radio', 'io', 'security', 'power', 'case', 'wifi', 'zigbee'].indexOf(components[c].slot) < 0) throw new Error('invalid');
    }
  }
  window.DevelopmentPresentation = {
    validate: validate,
    close: close,
    reset: function () { close(); current = 0; },
    open: function (data) {
      close(); validate(data); deck = data;
      document.getElementById('development-deck-title').textContent = data.title;
      for (var i = 0; i < deck.slides.length; i++) {
        (function (index) {
          var li = element('li'), button = element('button', '', deck.slides[index].label);
          button.type = 'button'; button.onclick = function () { show(index); }; li.appendChild(button); outline.appendChild(li);
        }(i));
      }
      previous.onclick = function () { show(current - 1); }; next.onclick = function () { show(current + 1); };
      document.getElementById('development-map').onclick = function () { show(0); }; fullscreen.onclick = toggleFullscreen;
      listen(document, 'fullscreenchange', fullscreenChanged); listen(document, 'webkitfullscreenchange', fullscreenChanged);
      listen(document, 'keydown', function (event) {
        if (!deck || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return;
        if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'Home', 'End'].indexOf(event.key) >= 0) {
          event.preventDefault();
          if (event.key === 'Home') show(0); else if (event.key === 'End') show(deck.slides.length - 1);
          else show(current + (event.key === 'ArrowLeft' || event.key === 'PageUp' ? -1 : 1));
        } else if (event.key === 'f' || event.key === 'F') toggleFullscreen();
        else if (event.key === 'i' || event.key === 'I') show(0);
      });
      listen(stage, 'touchstart', function (event) { touch = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null; }, {passive:true});
      listen(stage, 'touchend', function (event) {
        if (!touch || !event.changedTouches.length) return;
        var dx = event.changedTouches[0].clientX - touch.x, dy = event.changedTouches[0].clientY - touch.y;
        if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.8) show(current + (dx < 0 ? 1 : -1)); touch = null;
      }, {passive:true});
      listen(stage, 'touchcancel', function () { touch = null; });
      fullscreenChanged(); show(current);
    }
  };
}());
