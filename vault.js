(function () {
  'use strict';
  var key = null, cache = {}, pending = {}, generation = 0;
  var form = document.getElementById('unlock-form');
  var passwordInput = document.getElementById('presentation-password');
  var button = document.getElementById('unlock-button');
  var message = document.getElementById('access-message');
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
  function validate(slides) {
    if (!Array.isArray(slides) || !slides.length || slides.length > 200) throw new Error('invalid');
    for (var i = 0; i < slides.length; i++) {
      if (!/^slide-[0-9]{2,3}\.bin$/.test(slides[i].src) || typeof slides[i].title !== 'string' || typeof slides[i].text !== 'string') throw new Error('invalid');
    }
    return slides;
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
      }).catch(function (err) { delete pending[slide.src]; throw err; });
      return pending[slide.src];
    },
    close: function () {
      generation++; key = null;
      for (var path in cache) if (Object.prototype.hasOwnProperty.call(cache, path)) URL.revokeObjectURL(cache[path]);
      cache = {}; pending = {};
    }
  };
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder || !window.fetch) {
      message.textContent = 'Este navegador no admite el descifrado. Abre la página por HTTPS en un navegador compatible.'; return;
    }
    var password = passwordInput.value;
    if (!password) return;
    button.disabled = true; message.textContent = 'Abriendo la presentación…';
    var candidateKey, configuration;
    download('vault.json', true).then(function (config) {
      if (config.version !== 1 || config.kdf !== 'PBKDF2' || config.hash !== 'SHA-256' || config.iterations !== 600000 || config.manifest !== 'manifest.bin') throw new Error('invalid');
      configuration = config;
      return window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    }).then(function (material) {
      password = null;
      return window.crypto.subtle.deriveKey({name: 'PBKDF2', salt: base64(configuration.salt), iterations: configuration.iterations, hash: 'SHA-256'}, material, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    }).then(function (derivedKey) {
      candidateKey = derivedKey;
      return download(configuration.manifest, false);
    }).then(function (bytes) { return decrypt(bytes, candidateKey, configuration.manifest); }).then(function (plain) {
      var deck = JSON.parse(decode(plain));
      if (deck.version !== 1) throw new Error('invalid');
      var slides = validate(deck.slides);
      key = candidateKey; candidateKey = null; passwordInput.value = ''; password = null;
      document.getElementById('access').hidden = true;
      document.getElementById('presentation').hidden = false;
      window.startPresentation(slides);
      document.getElementById('stage').focus();
    }).catch(function (err) {
      candidateKey = null; password = null; passwordInput.value = ''; button.disabled = false;
      message.textContent = err.message === 'download' ? 'No se han podido descargar los archivos. Comprueba la conexión y vuelve a intentarlo.' : (err.name === 'OperationError' ? 'Contraseña incorrecta o contenido dañado. Vuelve a intentarlo.' : 'No se ha podido abrir la presentación en este navegador.');
      passwordInput.focus();
    });
  });
}());
