window.startPresentation = function (slides) {
  'use strict';
  if (!slides.length) return;
  var current = 0, hideTimer, touchX = null, touchY = null, requestNumber = 0;
  var image = document.getElementById('slide');
  var stage = document.getElementById('stage');
  var previous = document.getElementById('previous');
  var next = document.getElementById('next');
  var menu = document.getElementById('slide-index');
  var help = document.getElementById('help');
  var indexButton = document.getElementById('open-index');
  var helpButton = document.getElementById('help-button');
  var fullButton = document.getElementById('fullscreen');
  var error = document.getElementById('load-error');
  var indexItems = [];
  var thumbnails = [];
  function announce(text) { document.getElementById('announcement').textContent = text; }
  function fullElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function reveal() {
    document.body.classList.remove('controls-hidden');
    window.clearTimeout(hideTimer);
    if (fullElement() && menu.hidden && help.hidden) {
      hideTimer = window.setTimeout(function () { document.body.classList.add('controls-hidden'); }, 3500);
    }
  }
  function show(index, fromHash) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    var slide = slides[current], number = ++requestNumber;
    error.hidden = true;
    image.style.visibility = 'hidden';
    image.onload = function () { if (number === requestNumber) { error.hidden = true; image.style.visibility = 'visible'; } };
    image.onerror = function () { if (number === requestNumber) error.hidden = false; };
    window.DeckVault.getImage(slide).then(function (url) {
      if (number !== requestNumber) return;
      if (image.src === url && image.complete && image.naturalWidth) image.style.visibility = 'visible';
      else image.src = url;
    }).catch(function () { if (number === requestNumber) error.hidden = false; });
    image.alt = 'Diapositiva ' + (current + 1) + ': ' + slide.title;
    document.getElementById('slide-title').textContent = slide.title;
    document.getElementById('slide-description').textContent = slide.text;
    document.getElementById('counter').textContent = (current + 1) + ' / ' + slides.length;
    document.getElementById('progress').style.width = ((current + 1) / slides.length * 100) + '%';
    document.title = (current + 1) + ' · ' + slide.title + ' — SenNet E²S';
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    for (var k = 0; k < indexItems.length; k++) indexItems[k].setAttribute('aria-current', k === current ? 'true' : 'false');
    if (!fromHash) {
      if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + (current + 1));
      else window.location.hash = String(current + 1);
    }
    if (current + 1 < slides.length) window.DeckVault.getImage(slides[current + 1]).catch(function () {});
    reveal();
  }
  function readHash() {
    if (window.location.hash && !/^#[1-9][0-9]*$/.test(window.location.hash)) return;
    var number = parseInt(window.location.hash.substring(1), 10);
    show(isFinite(number) && number > 0 ? number - 1 : 0, true);
  }
  function closeMenu() { menu.hidden = true; indexButton.setAttribute('aria-expanded', 'false'); indexButton.focus(); reveal(); }
  function closeHelp() { help.hidden = true; helpButton.setAttribute('aria-expanded', 'false'); helpButton.focus(); reveal(); }
  function openMenu() {
    help.hidden = true; helpButton.setAttribute('aria-expanded', 'false');
    menu.hidden = false; indexButton.setAttribute('aria-expanded', 'true');
    for (var t = 0; t < thumbnails.length; t++) {
      (function (index) {
        window.DeckVault.getImage(slides[index]).then(function (url) { thumbnails[index].src = url; }).catch(function () {});
      }(t));
    }
    reveal(); indexItems[current].focus();
  }
  function openHelp() {
    menu.hidden = true; indexButton.setAttribute('aria-expanded', 'false');
    help.hidden = false; helpButton.setAttribute('aria-expanded', 'true');
    reveal(); document.getElementById('close-help').focus();
  }
  function failFullscreen() { announce('Este navegador no permite activar la pantalla completa. Usa la opción de pantalla completa de la TV o del navegador.'); }
  function toggleFullscreen() {
    try {
      var result;
      if (fullElement()) {
        if (document.exitFullscreen) result = document.exitFullscreen();
        else if (document.webkitExitFullscreen) result = document.webkitExitFullscreen();
      } else {
        var root = document.documentElement;
        if (root.requestFullscreen) result = root.requestFullscreen();
        else if (root.webkitRequestFullscreen) result = root.webkitRequestFullscreen();
        else { failFullscreen(); return; }
      }
      if (result && result.catch) result.catch(failFullscreen);
    } catch (e) { failFullscreen(); }
  }
  function fullscreenChanged() {
    var active = !!fullElement();
    document.body.classList.toggle('fullscreen-active', active);
    fullButton.textContent = active ? 'Salir de pantalla completa' : 'Pantalla completa';
    reveal();
  }
  for (var i = 0; i < slides.length; i++) {
    (function (index) {
      var li = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      var thumb = document.createElement('img');
      thumb.alt = ''; thumb.width = 320; thumb.height = 180; thumbnails.push(thumb);
      var label = document.createElement('span'); label.textContent = (index + 1) + '. ' + slides[index].title;
      button.appendChild(thumb); button.appendChild(label);
      button.onclick = function () { show(index); closeMenu(); };
      indexItems.push(button); li.appendChild(button); document.getElementById('index-list').appendChild(li);
    }(i));
  }
  previous.onclick = function () { show(current - 1); };
  next.onclick = function () { show(current + 1); };
  document.getElementById('retry').onclick = function () { show(current); };
  indexButton.onclick = openMenu;
  helpButton.onclick = openHelp;
  document.getElementById('close-index').onclick = closeMenu;
  document.getElementById('close-help').onclick = closeHelp;
  fullButton.onclick = toggleFullscreen;
  document.getElementById('lock').onclick = function () { window.DeckVault.close(); window.location.reload(); };
  document.addEventListener('fullscreenchange', fullscreenChanged);
  document.addEventListener('webkitfullscreenchange', fullscreenChanged);
  document.addEventListener('mousemove', reveal);
  document.addEventListener('touchstart', reveal, {passive: true});
  document.addEventListener('keydown', function (e) {
    var key = e.key || e.keyCode;
    if (key === 'Escape' || key === 27) { if (!help.hidden) closeHelp(); else if (!menu.hidden) closeMenu(); return; }
    if (!help.hidden || !menu.hidden) {
      if (key === 'Tab' || key === 9) {
        var panel = !help.hidden ? help : menu;
        var buttons = panel.querySelectorAll('button'), first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown' || key === 39 || key === 40 || key === 34) { e.preventDefault(); show(current + 1); }
    else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp' || key === 37 || key === 38 || key === 33) { e.preventDefault(); show(current - 1); }
    else if (key === ' ' || key === 'Spacebar' || key === 32) {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'A') { e.preventDefault(); show(current + (e.shiftKey ? -1 : 1)); }
    }
    else if (key === 'Home' || key === 36) { e.preventDefault(); show(0); }
    else if (key === 'End' || key === 35) { e.preventDefault(); show(slides.length - 1); }
    else if (key === 'f' || key === 'F' || key === 70) toggleFullscreen();
    else if (key === 'i' || key === 'I' || key === 73) openMenu();
    else reveal();
  });
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }
  }, {passive: true});
  stage.addEventListener('touchend', function (e) {
    if (touchX === null || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    touchX = null; touchY = null;
  }, {passive: true});
  stage.addEventListener('touchcancel', function () { touchX = null; touchY = null; });
  window.addEventListener('hashchange', readHash);
  readHash();
};
