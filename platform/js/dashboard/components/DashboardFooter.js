import { el } from '../../shared/dom.js';

const ICONS = {
  deposit: '<path d="M12 3v12M8 11l4 4 4-4M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  withdraw: '<path d="M12 21V9M8 13l4-4 4 4M4 3h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  referral: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  gift: '<path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M4 8h16M12 8v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 8a2.5 2.5 0 0 1 0-5C9.6 3 10.5 5 12 5s2.4-2 4-2a2.5 2.5 0 0 1 0 5H8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
};

function footerItem(label, icon, onClick) {
  const iconEl = el('span', { 'aria-hidden': 'true' });
  iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${ICONS[icon]}</svg>`;

  return el('button', {
    className: 'dash-footer__item',
    type: 'button',
    onClick,
  }, [iconEl, el('span', {}, [label])]);
}

export function DashboardFooter({
  onDeposit,
  onWithdraw,
  onOpenBet,
  onReferral,
  onGifts,
}) {
  const playBtn = el('button', {
    className: 'dash-footer__center-btn',
    type: 'button',
    'aria-label': 'Jogar — escolher valor da partida',
    onClick: onOpenBet,
  }, [
    el('div', { className: 'dash-footer__play' }, [
      el('span', { className: 'dash-footer__play-ring', 'aria-hidden': 'true' }),
      el('img', {
        className: 'dash-footer__play-img',
        src: 'assets/bird.png?cb=3',
        alt: '',
        width: '56',
        height: '56',
      }),
    ]),
    el('span', { className: 'dash-footer__center-label' }, ['Jogar']),
  ]);

  return el('footer', { className: 'dash-footer' }, [
    el('div', { className: 'dash-footer__bar' }, [
      footerItem('Depositar', 'deposit', onDeposit),
      footerItem('Sacar', 'withdraw', onWithdraw),
      el('div', { className: 'dash-footer__item dash-footer__item--center' }, [playBtn]),
      footerItem('Indique', 'referral', onReferral),
      footerItem('Presentes', 'gift', onGifts),
    ]),
  ]);
}
