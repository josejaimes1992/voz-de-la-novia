/* Se ejecuta en cada página de la app dentro del programa de Windows */
(function () {
  if (window.__VDN_NATIVE__ || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  window.__VDN_NATIVE__ = true;
  var inv = function (c, a) { try { return window.__TAURI_INTERNALS__.invoke(c, a || {}); } catch (e) { return Promise.reject(e); } };
  /* Los enlaces externos los abre el servidor local (funciona aunque falle el puente con la ventana) */
  var ext = function (u) { try { u = new URL(u, location.href).href; } catch (e) {}
    return fetch("/api/desktop/open", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u }) }).catch(function () { return inv("open_external", { url: u }); }); };
  var origOpen = window.open.bind(window);
  window.vdnNative = { invoke: inv, openExternal: ext };
  /* Ventanas nuevas: el proyector va a su propia ventana; lo demás (WhatsApp, enlaces) al navegador */
  window.open = function (url, name, feat) {
    if (name === "vdn-proyector" && window.__vdnProjFallback) return origOpen(url || "", name, feat);
    if (name === "vdn-proyector") { var w = null; inv("open_projector").catch(function () { w = origOpen("/proyector", "vdn-proyector"); }); return w; }
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
