/**
 * Deckhand — Google Apps Script web-app mirror.
 *
 * Why: the classroom Chromebox can't reach github.io (district block), so the
 * GitHub Pages copy never reaches the panel. A web app deployed from a
 * PERSONAL Google account is served from script.google.com /
 * googleusercontent.com, which a Workspace district leaves open, and it
 * executes as the deployer — so the school account only has to open a URL.
 *
 * Project files: this Code.gs + an HTML file named "Deckhand" whose content
 * is the release Deckhand.html, pasted whole.
 *
 * Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
 * Every new Deckhand release = replace the HTML file's content, then
 * Deploy → Manage deployments → edit → New version → Deploy (same URL).
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Deckhand")
    .setTitle("Deckhand")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
