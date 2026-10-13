import { createSharePayload, buildResultCardSvg } from '../../packages/share/index.js';

export function setupResultSharing(result, root = document) {
  const payload = createSharePayload(result);
  const share = async () => {
    if (navigator.share) return navigator.share({ title: payload.title, text: payload.text, url: payload.url });
    await navigator.clipboard?.writeText(`${payload.text} ${payload.url}`);
  };
  root.querySelector('[data-share]')?.addEventListener('click', share);
  root.querySelector('[data-share-whatsapp]')?.addEventListener('click', () => window.open(`https://wa.me/?text=${encodeURIComponent(payload.text + ' ' + payload.url)}`, '_blank', 'noopener,noreferrer'));
  root.querySelector('[data-share-facebook]')?.addEventListener('click', () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}&quote=${encodeURIComponent(payload.text)}`, '_blank', 'noopener,noreferrer'));
  root.querySelector('[data-share-x]')?.addEventListener('click', () => window.open(`https://x.com/intent/post?text=${encodeURIComponent(payload.text)}&url=${encodeURIComponent(payload.url)}`, '_blank', 'noopener,noreferrer'));
  root.querySelector('[data-download-card]')?.addEventListener('click', () => {
    const blob = new Blob([buildResultCardSvg(result)], { type: 'image/svg+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'billion-rush-result.svg'; a.click(); URL.revokeObjectURL(a.href);
  });
}
