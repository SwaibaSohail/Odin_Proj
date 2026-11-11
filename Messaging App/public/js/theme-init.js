// Applies the saved dark or light choice before the page is drawn.
try {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
} catch (e) {
  // Storage unavailable; the page follows the device's setting.
}
