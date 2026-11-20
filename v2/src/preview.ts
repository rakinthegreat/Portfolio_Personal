// Live demo previews, like the old site's "Live Preview" popup: the project runs inside the page,
// in a phone frame for mobile apps. Links stay real links, so ctrl/cmd-click still opens a new tab.
let dialog: HTMLDialogElement | null = null;

function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'preview';
  dialog.innerHTML = `
    <div class="preview-bar">
      <p class="preview-title" data-title></p>
      <a class="preview-open mono" data-open target="_blank" rel="noopener">Open in new tab ↗</a>
      <button class="preview-close" type="button" data-close aria-label="Close preview"><span class="x-text">✕</span><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
    </div>
    <div class="preview-frame" data-frame>
      <p class="preview-loading mono">Loading the live demo…</p>
    </div>`;
  document.body.append(dialog);
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog!.close());
  // click on the backdrop closes
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog!.close();
  });
  dialog.addEventListener('close', () => {
    // the close event is async: if another demo was opened meanwhile, keep it
    if (dialog!.open) return;
    dialog!.querySelector('iframe')?.remove(); // stop the demo (audio, timers) when closed
    document.documentElement.classList.remove('previewing');
  });
  return dialog;
}

export function openPreview(url: string, title: string, mobile = false) {
  const d = ensureDialog();
  d.classList.toggle('is-mobile', mobile);
  d.querySelector('[data-title]')!.textContent = title;
  d.querySelector<HTMLAnchorElement>('[data-open]')!.href = url;
  const frame = d.querySelector('[data-frame]')!;
  frame.querySelector('iframe')?.remove();
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.title = `${title} live demo`;
  iframe.allow = 'fullscreen; autoplay; clipboard-write; vibrate';
  iframe.addEventListener('load', () => frame.classList.add('loaded'), { once: true });
  frame.classList.remove('loaded');
  frame.append(iframe);
  document.documentElement.classList.add('previewing');
  if (!d.open) d.showModal();
}

/** Any `<a data-preview>` opens in the popup on a plain click. */
export function bindPreviewLinks(root: ParentNode = document) {
  root.addEventListener('click', (e) => {
    const ev = e as MouseEvent;
    const a = (ev.target as HTMLElement).closest<HTMLAnchorElement>('a[data-preview]');
    if (!a || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    openPreview(a.href, a.dataset.preview || a.textContent || 'Live demo', a.dataset.mobile === 'true');
  });
}
