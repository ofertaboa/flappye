import { el } from '../utils.js';
import { toast } from '../ui/toast.js';
import { settingsApi } from '../api/settings.js';

export function renderSettingsPage() {
  const page = el('div', { className: 'admin-page admin-page--settings' });
  const host = el('div', { className: 'admin-settings-grid admin-settings-grid--compact' });

  settingsApi.get().then((live) => {
    const s = { ...live, difficulty: live.difficulty || live.game_difficulty || 'dificil' };
    const adminUser = JSON.parse(sessionStorage.getItem('flappy_admin_user') || '{}');
    host.replaceChildren(
      section('Configurações Gerais', [
        input('game_name', 'Nome do jogo', s.game_name),
        input('logo', 'URL do logo', ''),
        input('banner', 'URL do banner', ''),
        toggle('maintenance', 'Modo manutenção', s.maintenance),
      ]),
      section('Configuração Financeira', [
        input('win_per_pipe', 'Valor por cano (Normal)', s.win_per_pipe, 'number', { step: '0.01', min: '0' }),
        input('demo_win_per_pipe', 'Valor por cano (Demo)', s.demo_win_per_pipe, 'number', { step: '0.01', min: '0' }),
        input('influencer_win_per_pipe', 'Valor por cano (Influenciador)', s.influencer_win_per_pipe, 'number', { step: '0.01', min: '0' }),
        el('p', { className: 'admin-hint', style: 'grid-column:1/-1;margin:0' }, [
          'Normal = jogadores reais · Demo = visitantes sem login · Influenciador = contas de parceiros.',
        ]),
        input('rollover_default', 'Rollover padrão (depósito)', s.rollover_default, 'number'),
        input('rollover_gift', 'Rollover de presentes', s.rollover_gift, 'number'),
        input('rollover_coupon', 'Rollover de cupons', s.rollover_coupon, 'number'),
        input('rollover_free_round', 'Rollover de rodadas grátis', s.rollover_free_round, 'number'),
        input('min_deposit', 'Depósito mínimo', s.min_deposit, 'number'),
        input('min_withdraw', 'Saque mínimo', s.min_withdraw, 'number'),
        input('cashback_pct', 'Cashback sobre perdas (%)', s.cashback_pct, 'number'),
        input('rollover_cashback', 'Rollover do cashback', s.rollover_cashback, 'number'),
        el('p', { className: 'admin-hint', style: 'grid-column:1/-1;margin:0' }, [
          'Ex.: 50% — jogador aposta R$ 20 e perde a partida → recebe R$ 10 de cashback no saldo.',
        ]),
      ]),
      section('Configuração do Jogo', [
        select('difficulty', 'Dificuldade geral (modo demo)', ['facil', 'medio', 'dificil'], s.difficulty),
        el('p', { className: 'admin-hint', style: 'grid-column:1/-1;margin:0' }, [
          'Influenciadores jogam sempre no modo fácil. Usuários com saldo real jogam sempre no modo difícil.',
        ]),
        input('lives', 'Vidas', s.lives, 'number'),
        input('protection_time', 'Proteção (s)', s.protection_time, 'number'),
        input('min_bet', 'Aposta mínima', s.min_bet, 'number', { step: '0.01', min: '0' }),
        input('max_bet', 'Aposta máxima', s.max_bet, 'number', { step: '0.01', min: '0' }),
        input('meta_multiplier', 'Multiplicador da meta (× aposta)', s.meta_multiplier, 'number', { step: '0.1', min: '1' }),
        el('p', { className: 'admin-hint', style: 'grid-column:1/-1;margin:0' }, [
          'Ex.: 5 — meta da partida = valor apostado × 5 (aposta R$ 10 → meta R$ 50).',
        ]),
      ]),
      section('Influenciadores', [
        input('influencer_montante_pct_default', 'Percentual padrão do montante (%)', s.influencer_montante_pct_default, 'number'),
        input('influencer_montante_initial', 'Valor inicial do montante', s.influencer_montante_initial, 'number'),
        select('influencer_default_mode', 'Modo padrão', ['demo', 'facil'], s.influencer_default_mode),
        el('p', { className: 'admin-hint', style: 'grid-column:1/-1;margin:0' }, ['Influenciadores não possuem rollover.']),
      ]),
      section('Indicações (usuário normal)', [
        input('referral_reward', 'Bônus por indicação (R$)', s.referral_reward, 'number', { step: '0.01', min: '0' }),
        input('referral_min_deposit', 'Depósito mínimo do indicado (R$)', s.referral_min_deposit, 'number', { step: '0.01', min: '0' }),
        input('rollover_referral', 'Rollover do bônus de indicação', s.rollover_referral, 'number'),
        el('p', { className: 'admin-hint', style: 'grid-column:1/-1;margin:0' }, [
          'Ex.: bônus R$ 20 e depósito mínimo R$ 20 — quando um amigo indicado depositar R$ 20 ou mais (primeira vez), o indicador recebe R$ 20 no saldo. Influenciadores usam comissão em % (montante), não este valor fixo.',
        ]),
      ]),
      credentialsSection(adminUser),
    );
  }).catch((err) => {
    host.replaceChildren(el('p', { className: 'admin-alert admin-alert--error' }, [
      err.message || 'Não foi possível carregar as configurações.',
    ]));
  });

  page.append(host);
  return page;
}

function parseSettingNumber(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).trim().replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function section(title, fields) {
  const form = el('form', { className: 'admin-panel admin-panel--compact admin-form-grid admin-form-grid--dense' });
  form.append(el('h3', { className: 'admin-settings-section__title' }, [title]));
  fields.forEach((f) => form.append(f));
  form.append(el('button', { className: 'admin-btn admin-btn--primary admin-btn--sm', type: 'submit', style: 'grid-column:1/-1;justify-self:start' }, ['Salvar']));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v, k) => {
      const cb = form.querySelector(`[name="${k}"][type=checkbox]`);
      if (cb) data[k] = cb.checked;
      else if (['game_name', 'logo', 'banner', 'difficulty', 'influencer_default_mode'].includes(k)) data[k] = v;
      else {
        const num = parseSettingNumber(v);
        data[k] = num != null ? num : v;
      }
    });
    const gameKeys = [
      'game_difficulty', 'game_name', 'maintenance',
      'win_per_pipe', 'demo_win_per_pipe', 'influencer_win_per_pipe',
      'min_bet', 'max_bet', 'meta_multiplier',
      'influencer_montante_pct_default', 'influencer_montante_initial',
      'referral_reward', 'referral_min_deposit', 'rollover_referral',
      'rollover_default', 'rollover_gift', 'rollover_coupon', 'rollover_free_round',
      'cashback_pct', 'rollover_cashback',
    ];
    const persisted = {};
    Object.entries(data).forEach(([k, v]) => {
      if (gameKeys.includes(k) || k === 'difficulty') persisted[k] = v;
    });
    if (!Object.keys(persisted).length) {
      toast('Nada para salvar nesta seção.', 'info');
      return;
    }
    try {
      await settingsApi.save(persisted);
      toast('Salvo — inicie uma nova partida para aplicar no jogo.');
    } catch (err) {
      toast(err.message || 'Erro ao salvar configurações.', 'error');
    }
  });
  return form;
}

function credentialsSection(adminUser) {
  const form = el('form', { className: 'admin-panel admin-panel--compact admin-form-grid admin-form-grid--dense' });
  form.append(el('h3', { className: 'admin-settings-section__title' }, ['Acesso ao Painel']));
  form.append(
    input('admin_user', 'Usuário', adminUser.username || 'admin'),
    input('admin_email', 'E-mail', adminUser.email || ''),
    input('admin_pass', 'Senha', '', 'password'),
    input('admin_pass_confirm', 'Confirmar senha', '', 'password'),
    el('p', { className: 'admin-hint', style: 'grid-column:1/-1;margin:0' }, ['Usuário e senha do admin são definidos no arquivo de configuração do servidor (fora do htdocs).']),
  );
  form.append(el('button', { className: 'admin-btn admin-btn--primary admin-btn--sm', type: 'submit', style: 'grid-column:1/-1' }, ['Salvar Credenciais']));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    if (fd.get('admin_pass') && fd.get('admin_pass') !== fd.get('admin_pass_confirm')) {
      toast('Senhas não coincidem', 'error');
      return;
    }
    sessionStorage.setItem('flappy_admin_user', JSON.stringify({ username: fd.get('admin_user'), email: fd.get('admin_email') }));
    toast('Credenciais salvas (mock)', 'info');
  });
  return form;
}

function input(name, label, value, type = 'text', extra = {}) {
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    el('input', {
      className: 'admin-input admin-input--sm',
      name,
      value: String(value ?? ''),
      type,
      step: extra.step,
      min: extra.min,
      max: extra.max,
    }),
  ]);
}

function select(name, label, options, selected) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name });
  options.forEach((o) => sel.append(el('option', { value: o, selected: o === selected ? 'selected' : undefined }, [o])));
  return el('label', { className: 'admin-field' }, [el('span', { className: 'admin-field__label' }, [label]), sel]);
}

function toggle(name, label, checked) {
  return el('label', { className: 'admin-field admin-field--check' }, [
    el('input', { type: 'checkbox', name, checked: !!checked }),
    el('span', { className: 'admin-field__label' }, [label]),
  ]);
}
