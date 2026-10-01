import { el } from '../../shared/dom.js';
import { vibrate } from '../../shared/ui/haptics.js';
import { apiFetch } from '../../shared/api.js';
import { assetUrl } from '../../shared/paths.js';

/** @typedef {'deposit'|'gifts'|'play'|'referral'|'none'|'url'} BannerAction */

const FALLBACK_BANNERS = [
  {
    image_url: 'assets/banners/deposito-minimo.png',
    title: 'Depósito mínimo — adicione saldo',
    action: 'deposit',
    action_url: '',
  },
  {
    image_url: 'assets/banners/presentes.png',
    title: 'Presentes — ganhe prêmios',
    action: 'gifts',
    action_url: '',
  },
  {
    image_url: 'assets/banners/jogue-agora.png',
    title: 'Jogue agora',
    action: 'play',
    action_url: '',
  },
  {
    image_url: 'assets/banners/convide-um-amigo.png',
    title: 'Convide um amigo',
    action: 'referral',
    action_url: '',
  },
];

export function resolveBannerSrc(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url) return assetUrl('assets/banners/deposito-minimo.png');
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = url.replace(/^\//, '').replace(/^\.\.\//, '');
  return assetUrl(normalized);
}

async function fetchBannersFromApi() {
  const data = await apiFetch('banners.php', { timeout: 5000 });
  const list = Array.isArray(data.banners) ? data.banners : [];
  return list.length ? list : null;
}

function mountBanners(shell, banners, onAction) {
  shell.classList.remove('dash-carousel--loading');
  shell.classList.add('is-ready');
  const parts = createCarouselParts(banners, onAction);
  shell.replaceChildren(...parts);
}

/**
 * @param {{ onAction?: Partial<Record<BannerAction, () => void>> }} options
 */
export function BannerCarousel({ onAction = {} } = {}) {
  const shell = el('section', {
    className: 'dash-carousel',
    'aria-label': 'Promoções',
    'aria-roledescription': 'carrossel',
  }, []);

  const initial = [...FALLBACK_BANNERS];
  mountBanners(shell, initial, onAction);

  fetchBannersFromApi()
    .then((remote) => {
      if (remote?.length) {
        mountBanners(shell, remote, onAction);
      }
    })
    .catch(() => {
      /* mantém fallbacks locais */
    });

  return shell;
}

function createCarouselParts(banners, onAction) {
  let current = 0;
  let timer = null;
  let dragStartX = 0;
  let didDrag = false;

  const track = el('div', { className: 'dash-carousel__track' });
  const dots = [];

  banners.forEach((banner, i) => {
    const img = el('img', {
      className: 'dash-carousel__img',
      src: resolveBannerSrc(banner.image_url),
      alt: banner.title || 'Banner promocional',
      loading: i === 0 ? 'eager' : 'lazy',
      draggable: 'false',
    });
    img.addEventListener('error', () => {
      img.src = assetUrl('assets/banners/deposito-minimo.png');
    });

    const action = banner.action || 'none';
    const slideBtn = el('button', {
      className: 'dash-carousel__slide-btn',
      type: 'button',
      'aria-label': banner.title || 'Banner promocional',
      onClick: () => {
        if (didDrag) return;
        vibrate(10);
        if (action === 'url' && banner.action_url) {
          window.open(banner.action_url, '_blank', 'noopener,noreferrer');
          return;
        }
        onAction[action]?.();
      },
    }, [img]);

    track.append(el('div', {
      className: 'dash-carousel__slide',
      'aria-hidden': i !== 0 ? 'true' : 'false',
    }, [slideBtn]));
  });

  const viewport = el('div', { className: 'dash-carousel__viewport' }, [track]);

  viewport.addEventListener('pointerdown', (e) => {
    dragStartX = e.clientX;
    didDrag = false;
  });

  viewport.addEventListener('pointermove', (e) => {
    if (Math.abs(e.clientX - dragStartX) > 8) didDrag = true;
  });

  const dotsWrap = el('div', { className: 'dash-carousel__dots', role: 'tablist' });

  function goTo(index) {
    current = (index + banners.length) % banners.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    track.querySelectorAll('.dash-carousel__slide').forEach((slide, i) => {
      slide.setAttribute('aria-hidden', i !== current ? 'true' : 'false');
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === current);
      dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
  }

  banners.forEach((_, i) => {
    const dot = el('button', {
      className: `dash-carousel__dot${i === 0 ? ' is-active' : ''}`,
      type: 'button',
      role: 'tab',
      'aria-label': `Banner ${i + 1}`,
      'aria-selected': i === 0 ? 'true' : 'false',
      onClick: () => {
        goTo(i);
        resetTimer();
      },
    });
    dots.push(dot);
    dotsWrap.append(dot);
  });

  function resetTimer() {
    if (timer) clearInterval(timer);
    if (banners.length > 1) {
      timer = setInterval(() => goTo(current + 1), 5000);
    }
  }

  resetTimer();

  return banners.length > 1 ? [viewport, dotsWrap] : [viewport];
}
