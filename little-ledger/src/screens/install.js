import { esc } from '../ui.js';
import { coverArt } from './welcome.js';

/**
 * The page a browser visitor sees before the app is installed: the same paper
 * cover as the welcome screen, with one job — put Ledger on the home screen.
 */
export function renderInstall({ message = '', canPrompt = false } = {}) {
  return `
    <div class="cover">
      <div class="cover-sheet">
        ${coverArt()}
        <div class="cover-body">
          <p class="eyebrow">Private cash book</p>
          <h1 class="cover-title">Your own<br />ledger</h1>
          <p class="cover-copy">
            One cover, every entry &mdash; kept on your phone and ready without a signal.
          </p>

          <button type="button" class="btn btn-primary btn-block" data-action="install-app">
            Install Ledger
          </button>
          <p class="cover-hint" role="status">${esc(message || (canPrompt
            ? 'One tap adds it to your home screen.'
            : 'Tap the install button for the two-step guide.'))}</p>

          <button type="button" class="link cover-skip" data-action="continue-browser">
            Keep using it in this browser
          </button>
        </div>

        <p class="cover-foot">Pocket sized &middot; No accounts &middot; Works offline</p>
      </div>
    </div>
  `;
}
