(function () {
  'use strict';
  var key = null, cache = {}, pending = {}, documents = {}, generation = 0;
  var slides = [], presentationHash = '#1';
  var form = document.getElementById('unlock-form');
  var passwordInput = document.getElementById('presentation-password');
  var button = document.getElementById('unlock-button');
  var message = document.getElementById('access-message');
  var hub = document.getElementById('content-hub');
  var hubMessage = document.getElementById('hub-message');
  var developmentChoice = document.getElementById('choose-development');
  function download(path, asJSON) {
    return fetch(path, {cache: 'no-store', credentials: 'same-origin'}).then(function (response) {
      if (!response.ok) throw new Error('download');
      return asJSON ? response.json() : response.arrayBuffer();
    });
  }
  function base64(value) {
    var raw = atob(value), bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }
  function decode(bytes) {
    if (window.TextDecoder) return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    var result = '', view = new Uint8Array(bytes);
    for (var i = 0; i < view.length; i++) result += '%' + ('0' + view[i].toString(16)).slice(-2);
    return decodeURIComponent(result);
  }
  function decrypt(bytes, cryptoKey, path) {
    if (bytes.byteLength < 28) return Promise.reject(new Error('invalid'));
    return window.crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode('CDTI-E2S|' + path), tagLength: 128}, cryptoKey, bytes.slice(12));
  }
  function validate(items) {
    if (!Array.isArray(items) || !items.length || items.length > 200) throw new Error('invalid');
    for (var i = 0; i < items.length; i++) {
      if (!/^slide-[0-9]{2,3}\.bin$/.test(items[i].src) || typeof items[i].title !== 'string' || typeof items[i].text !== 'string') throw new Error('invalid');
    }
    return items;
  }
  function route(hash) {
    if (window.history && window.history.replaceState) window.history.replaceState(null, '', hash);
    else window.location.hash = hash;
  }
  function closeCurrent() {
    if (!document.getElementById('presentation').hidden && /^#[1-9][0-9]*$/.test(window.location.hash)) presentationHash = window.location.hash;
    if (window.stopPresentation) window.stopPresentation();
    if (window.DevelopmentPresentation) window.DevelopmentPresentation.close();
    document.getElementById('presentation').hidden = true;
    document.getElementById('development').hidden = true;
    document.body.classList.remove('controls-hidden', 'fullscreen-active');
  }
  function showHub() {
    if (!key) return;
    closeCurrent(); hub.hidden = false; hubMessage.textContent = '';
    document.title = 'CDTI · E²S — SenNet'; route('#inicio');
    document.getElementById('hub-heading').focus();
  }
  function clearSession() {
    generation++; key = null; slides = [];
    for (var path in cache) if (Object.prototype.hasOwnProperty.call(cache, path)) URL.revokeObjectURL(cache[path]);
    cache = {}; pending = {}; documents = {};
  }
  function lock() {
    closeCurrent(); clearSession();
    hub.hidden = true; document.getElementById('access').hidden = false;
    passwordInput.value = ''; button.disabled = false; message.textContent = ''; hubMessage.textContent = '';
    developmentChoice.disabled = false; document.getElementById('announcement').textContent = '';
    window.DevelopmentPresentation.reset();
    presentationHash = '#1'; document.title = 'CDTI · E²S — SenNet'; route('#');
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
      try { var result = exit.call(document); if (result && result.catch) result.catch(function () {}); } catch (_error) {}
    }
    passwordInput.focus();
  }
  window.DeckVault = {
    getImage: function (slide) {
      if (!key) return Promise.reject(new Error('locked'));
      if (cache[slide.src]) return Promise.resolve(cache[slide.src]);
      if (pending[slide.src]) return pending[slide.src];
      var expectedGeneration = generation, cryptoKey = key;
      pending[slide.src] = download(slide.src, false).then(function (bytes) { return decrypt(bytes, cryptoKey, slide.src); }).then(function (plain) {
        if (generation !== expectedGeneration || !key) throw new Error('locked');
        var header = new Uint8Array(plain, 0, Math.min(8, plain.byteLength));
        if (header.length !== 8 || header[0] !== 137 || header[1] !== 80 || header[2] !== 78 || header[3] !== 71 || header[4] !== 13 || header[5] !== 10 || header[6] !== 26 || header[7] !== 10) throw new Error('invalid');
        var url = URL.createObjectURL(new Blob([plain], {type: 'image/png'}));
        cache[slide.src] = url; delete pending[slide.src]; return url;
      }).catch(function (err) { if (generation === expectedGeneration) delete pending[slide.src]; throw err; });
      return pending[slide.src];
    },
    getDocument: function (path) {
      if (!key || path !== 'development.bin') return Promise.reject(new Error('locked'));
      if (documents[path]) return Promise.resolve(documents[path]);
      var expectedGeneration = generation, cryptoKey = key;
      return download(path, false).then(function (bytes) { return decrypt(bytes, cryptoKey, path); }).then(function (plain) {
        if (generation !== expectedGeneration || !key) throw new Error('locked');
        var data = JSON.parse(decode(plain));
        window.DevelopmentPresentation.validate(data); documents[path] = data; return data;
      });
    },
    close: lock,
    lock: lock,
    showHub: showHub
  };
  document.getElementById('choose-presentation').onclick = function () {
    if (!key) return;
    closeCurrent(); hub.hidden = true; document.getElementById('presentation').hidden = false;
    route(presentationHash); window.startPresentation(slides); document.getElementById('stage').focus();
  };
  developmentChoice.onclick = function () {
    if (!key) return;
    var expectedGeneration = generation;
    developmentChoice.disabled = true; hubMessage.textContent = 'Abriendo el esquema de desarrollo…';
    window.DeckVault.getDocument('development.bin').then(function (data) {
      if (generation !== expectedGeneration || !key) return;
      closeCurrent(); hub.hidden = true; document.getElementById('development').hidden = false;
      window.DevelopmentPresentation.open(data);
    }).catch(function (err) {
      if (generation !== expectedGeneration) return;
      hubMessage.textContent = err.message === 'download' ? 'No se ha podido descargar el esquema. Comprueba la conexión y vuelve a intentarlo.' : 'No se ha podido abrir el esquema. Vuelve a intentarlo.';
    }).then(function () { if (generation === expectedGeneration) developmentChoice.disabled = false; });
  };
  document.getElementById('hub-lock').onclick = lock;
  document.getElementById('development-home').onclick = showHub;
  document.getElementById('development-lock').onclick = lock;
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (button.disabled) return;
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder || !window.fetch) {
      message.textContent = 'Este navegador no admite el descifrado. Abre la página por HTTPS en un navegador compatible.'; return;
    }
    var password = passwordInput.value;
    if (!password) return;
    button.disabled = true; message.textContent = 'Comprobando el acceso…';
    var candidateKey, configuration, expectedGeneration = generation;
    download('vault.json', true).then(function (config) {
      if (config.version !== 1 || config.kdf !== 'PBKDF2' || config.hash !== 'SHA-256' || config.iterations !== 600000 || config.manifest !== 'manifest.bin') throw new Error('invalid');
      configuration = config;
      return window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    }).then(function (material) {
      password = null; passwordInput.value = '';
      return window.crypto.subtle.deriveKey({name: 'PBKDF2', salt: base64(configuration.salt), iterations: configuration.iterations, hash: 'SHA-256'}, material, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    }).then(function (derivedKey) {
      candidateKey = derivedKey; return download(configuration.manifest, false);
    }).then(function (bytes) { return decrypt(bytes, candidateKey, configuration.manifest); }).then(function (plain) {
      if (generation !== expectedGeneration) throw new Error('locked');
      var deck = JSON.parse(decode(plain));
      if (deck.version !== 1) throw new Error('invalid');
      slides = validate(deck.slides); key = candidateKey; candidateKey = null; password = null;
      if (/^#[1-9][0-9]*$/.test(window.location.hash)) presentationHash = window.location.hash;
      document.getElementById('access').hidden = true; showHub();
    }).catch(function (err) {
      candidateKey = null; password = null; passwordInput.value = ''; button.disabled = false;
      message.textContent = err.message === 'download' ? 'No se han podido descargar los archivos. Comprueba la conexión y vuelve a intentarlo.' : (err.name === 'OperationError' ? 'Contraseña incorrecta o contenido dañado. Vuelve a intentarlo.' : 'No se ha podido abrir el contenido en este navegador.');
      passwordInput.focus();
    });
  });
}());
