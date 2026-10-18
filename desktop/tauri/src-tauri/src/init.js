/* Se ejecuta en cada página de la app dentro del programa de Windows */
(function () {
  if (window.__VDN_NATIVE__ || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  window.__VDN_NATIVE__ = true;
  var inv = function (c, a) { try { return window.__TAURI_INTERNALS__.invoke(c, a || {}); } catch (e) { return Promise.reject(e); } };
  var ext = function (u) { try { u = new URL(u, location.href).href; } catch (e) {} return inv("open_external", { url: u }); };
  window.vdnNative = { invoke: inv, openExternal: ext };
  /* Ventanas nuevas: el proyector va a su propia ventana; lo demás (WhatsApp, enlaces) al navegador */
  window.open = function (url, name) {
    if (name === "vdn-proyector") { inv("open_projector"); return null; }
    var fake = { closed: false, close: function () { this.closed = true; }, focus: function () {}, document: { write: function () {}, close: function () {} },
      location: { set href(u) { ext(u); }, get href() { return "about:blank"; }, get pathname() { return ""; } } };
    if (url) ext(url);
    return fake;
  };
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[target=_blank]");
    if (a && a.href && !a.hasAttribute("download")) { e.preventDefault(); ext(a.href); }
  }, true);
})();
