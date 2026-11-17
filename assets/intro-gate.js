/* Runs in <head>: decides before first paint whether the 3D intro plays.
   Plays once per browser session, or again when the page is opened with ?intro.
   Skipped for users who prefer reduced motion. */
(function () {
  var force = /[?&]intro\b/.test(location.search);
  var seen = false;
  try { seen = sessionStorage.getItem('adk_intro_seen') === '1'; } catch (e) {}
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (force || (!seen && !reduce)) document.documentElement.classList.add('intro-pending');
})();
