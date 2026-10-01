import { el } from '../../shared/dom.js';
import { appUrl } from '../../shared/paths.js';

export function Hero() {
  return el('section', { className: 'hero', id: 'inicio' }, [
    el('div', { className: 'hero__overlay', 'aria-hidden': 'true' }),
    el('div', { className: 'container hero__content reveal is-visible' }, [
      el('img', {
        className: 'hero__brand-logo',
        src: 'assets/logo-hero.png?v=3',
        alt: 'Flappy Pay',
        width: '380',
        height: '380',
      }),
      el('div', { className: 'hero__stack' }, [
        el('div', { className: 'hero__intro' }, [
          el('span', { className: 'hero__eyebrow' }, ['Jogo de habilidade']),
          el('p', { className: 'hero__subtitle' }, [
            'Voe entre os obstáculos, supere sua meta e ',
            el('strong', {}, ['transforme sua habilidade em dinheiro real']),
            '. Aposte com estratégia e saque seus ganhos na hora.',
          ]),
        ]),
        el('div', { className: 'hero__actions' }, [
          el('a', {
            className: 'btn btn--yellow btn--play',
            href: appUrl('game.html?mode=demo'),
          }, ['Jogar grátis']),
        ]),
        el('ul', { className: 'hero__perks', 'aria-label': 'Destaques' }, [
          el('li', { className: 'hero__perk' }, [
            el('span', { className: 'hero__perk-icon', 'aria-hidden': 'true' }, ['⚡']),
            'Saque instantâneo',
          ]),
          el('li', { className: 'hero__perk' }, [
            el('span', { className: 'hero__perk-icon', 'aria-hidden': 'true' }, ['🤝']),
            'Indique e ganhe',
          ]),
          el('li', { className: 'hero__perk' }, [
            el('span', { className: 'hero__perk-icon', 'aria-hidden': 'true' }, ['🛡️']),
            '100% seguro',
          ]),
        ]),
      ]),
    ]),
  ]);
}
