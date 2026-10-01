import { el, fmtMoney } from '../utils.js';
import { DataTable, StatusBadge, ActionBtn } from '../ui/table.js';
import { confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { giftsApi } from '../api/gifts.js';
import { couponsApi } from '../api/coupons.js';
import { showLoading, hideLoading } from '../ui/loading.js';
import { GIFT_REWARD_TYPES, GIFT_TRIGGER_TYPES } from '../mock/giftEngine.js';

const REWARD_LABELS = Object.fromEntries(GIFT_REWARD_TYPES);
const TRIGGER_LABELS = Object.fromEntries(GIFT_TRIGGER_TYPES);

export function renderGiftsPage() {
  const page = el('div', { className: 'admin-page admin-page--gifts' });
  const host = el('div');
  let editingId = null;
  let coupons = [];
  const formHost = el('div');
  const globalHost = el('div', { className: 'admin-gifts-global' });

  async function loadGlobalToggle() {
    const settings = await giftsApi.getSettings();
    globalHost.replaceChildren(
      el('div', { className: 'admin-gifts-global__inner' }, [
        el('div', { className: 'admin-gifts-global__text' }, [
          el('strong', {}, ['Presentes na plataforma']),
          el('p', {}, ['Ative ou desative os presentes para todos os usuários de uma vez.']),
        ]),
        el('label', { className: 'admin-toggle' }, [
          el('input', {
            type: 'checkbox',
            checked: settings.gifts_enabled !== false ? 'checked' : undefined,
            onChange: async (e) => {
              try {
                await giftsApi.saveSettings({ gifts_enabled: e.target.checked });
                toast(e.target.checked ? 'Presentes ativados para todos' : 'Presentes desativados globalmente', 'info');
              } catch (err) {
                e.target.checked = !e.target.checked;
                toast(err.message || 'Erro ao salvar', 'error');
              }
            },
          }),
          el('span', { className: 'admin-toggle__track' }),
          el('span', { className: 'admin-toggle__label' }, ['Ativo para todos']),
        ]),
      ]),
    );
  }

  function buildForm(data = null) {
    editingId = data?.id ?? null;
    const trigger = data?.trigger_type || 'marco_deposito_qtd';

    const form = el('form', { className: 'admin-inline-form admin-gifts-form' }, [
      el('h3', { className: 'admin-inline-form__title' }, [
        data ? `Editar: ${data.name}` : 'Novo presente / campanha',
      ]),
      el('div', { className: 'admin-form-grid admin-form-grid--dense' }, [
        inp('name', 'Nome do presente', data?.name, 'Ex: iPhone 17 Pro Max'),
        inp('description', 'Descrição', data?.description, 'Texto que o jogador vê'),
        inp('image_url', 'URL da foto (opcional)', data?.image_url, 'https://...'),
        inp('icon', 'Ícone (emoji)', data?.icon || '🎁', '📱'),
        rewardTypeSel('reward_type', data?.reward_type || 'saldo'),
        inp('reward_value', 'Valor / quantidade', data?.reward_value ?? data?.value ?? 0, '', 'number'),
        inp('reward_label', 'Nome do prêmio físico', data?.reward_label, 'iPhone 17 Pro Max'),
        triggerSel('trigger_type', trigger),
        inp('milestone_count', 'Meta (qtd ou R$)', data?.milestone_count ?? 5, '5 ou 700', 'number'),
        inp('milestone_label', 'Label da meta', data?.milestone_label || 'depósitos', 'depósitos'),
        couponSel(coupons, data?.coupon_id, data?.coupon_name),
        inp('qty', 'Limite de resgates (0=∞)', data?.qty ?? 0, '0', 'number'),
        inp('rollover', 'Rollover', data?.rollover ?? 1, '1', 'number'),
        inp('start', 'Início', data?.start, '', 'date'),
        inp('end', 'Fim', data?.end, '', 'date'),
        inp('expires_days', 'Expira após (dias)', data?.expires_days ?? 7, '7', 'number'),
        sel('status', 'Status', ['ativo', 'inativo'], data?.status || 'ativo'),
        chk('is_default_new_user', 'Presente p/ novos usuários', data?.is_default_new_user),
      ]),
      el('p', { className: 'admin-field-hint admin-field--full' }, [
        'Cupons de depósito em dobro são criados na aba Cupons. Aqui você vincula um cupom a um presente (ex: use cupom → ganhe 10 rodadas).',
      ]),
      el('div', { className: 'admin-inline-form__row admin-gifts-form__actions' }, [
        el('button', { className: 'admin-btn admin-btn--primary admin-btn--sm', type: 'submit' }, [
          data ? 'Salvar alterações' : 'Criar presente',
        ]),
        data ? el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => { editingId = null; render(); },
        }, ['Cancelar']) : null,
        data ? el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => sendToAll(data),
        }, ['Enviar p/ todos agora']) : null,
      ].filter(Boolean)),
    ]);

    const triggerSelect = form.querySelector('[name=trigger_type]');
    const couponField = form.querySelector('[name=coupon_id]')?.closest('.admin-field');
    const milestoneFields = ['milestone_count', 'milestone_label'].map(
      (n) => form.querySelector(`[name=${n}]`)?.closest('.admin-field'),
    ).filter(Boolean);

    function updateTriggerUI() {
      const t = triggerSelect.value;
      if (couponField) couponField.hidden = t !== 'cupom_deposito';
      milestoneFields.forEach((f) => {
        if (f) f.hidden = !t.startsWith('marco_');
      });
    }
    triggerSelect?.addEventListener('change', updateTriggerUI);
    updateTriggerUI();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const couponId = fd.get('coupon_id');
      await giftsApi.save({
        id: editingId,
        name: fd.get('name'),
        description: fd.get('description'),
        image_url: fd.get('image_url'),
        icon: fd.get('icon'),
        reward_type: fd.get('reward_type'),
        reward_value: Number(fd.get('reward_value')),
        reward_label: fd.get('reward_label'),
        trigger_type: fd.get('trigger_type'),
        milestone_count: Number(fd.get('milestone_count')),
        milestone_label: fd.get('milestone_label'),
        coupon_id: couponId ? Number(couponId) : null,
        qty: Number(fd.get('qty')),
        rollover: Number(fd.get('rollover')),
        start: fd.get('start'),
        end: fd.get('end'),
        expires_days: Number(fd.get('expires_days')),
        is_default_new_user: form.querySelector('[name=is_default_new_user]').checked,
        status: fd.get('status'),
      });
      toast(editingId ? 'Presente atualizado' : 'Presente criado');
      editingId = null;
      render();
    });

    return form;
  }

  function giftPreviewCell(row) {
    if (row.image_url) {
      return el('img', {
        className: 'admin-gifts-thumb',
        src: row.image_url,
        alt: '',
        loading: 'lazy',
      });
    }
    return el('span', { className: 'admin-gifts-thumb admin-gifts-thumb--emoji' }, [row.icon || '🎁']);
  }

  function milestoneCell(row) {
    if (!row.milestone_count || row.milestone_count <= 0) return '—';
    return `${row.milestone_count} ${row.milestone_label || 'depósitos'}`;
  }

  async function render() {
    showLoading();
    try {
      const [gifts, couponList] = await Promise.all([giftsApi.list(), couponsApi.list()]);
      coupons = couponList;
      await loadGlobalToggle();
      formHost.replaceChildren(buildForm(editingId ? gifts.find((g) => g.id === editingId) : null));

      host.replaceChildren(
        globalHost,
        formHost,
        el('div', { className: 'admin-panel admin-panel--compact' }, [
          el('h2', { className: 'admin-panel__title', style: 'margin-bottom:0.45rem' }, [
            'Campanhas cadastradas',
          ]),
          DataTable({
            columns: [
              { key: 'preview', label: '', render: giftPreviewCell },
              { key: 'name', label: 'Presente' },
              {
                key: 'reward_type',
                label: 'Prêmio',
                render: (r) => formatReward(r),
              },
              {
                key: 'trigger_type',
                label: 'Gatilho',
                render: (r) => TRIGGER_LABELS[r.trigger_type] || r.trigger_type,
              },
              { key: 'milestone', label: 'Meta', render: milestoneCell },
              {
                key: 'coupon_name',
                label: 'Cupom',
                render: (r) => r.coupon_name || '—',
              },
              { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
            ],
            rows: gifts,
            actions: (row) => [
              ActionBtn({
                label: row.status === 'ativo' ? 'Desativar' : 'Ativar',
                icon: row.status === 'ativo' ? '⏸' : '▶',
                onClick: () => toggleStatus(row),
              }),
              ActionBtn({ label: 'Editar', icon: '✎', onClick: () => { editingId = row.id; render(); } }),
              ActionBtn({ label: 'Enviar p/ todos', icon: '📤', onClick: () => sendToAll(row) }),
              ActionBtn({ label: 'Excluir', icon: '✕', danger: true, onClick: () => remove(row) }),
            ],
          }),
        ]),
      );
    } catch (err) {
      toast(err.message || 'Erro ao carregar presentes', 'error');
    } finally {
      hideLoading();
    }
  }

  async function toggleStatus(row) {
    const next = row.status === 'ativo' ? 'inativo' : 'ativo';
    await giftsApi.toggle(row.id, next);
    toast(next === 'ativo' ? 'Presente ativado' : 'Presente desativado', 'info');
    render();
  }

  async function sendToAll(row) {
    const ok = await confirmDialog({
      title: 'Enviar presente para todos',
      message: `Enviar "${row.name}" para todos os usuários ativos agora?`,
      confirmLabel: 'Enviar para todos',
    });
    if (!ok) return;
    const { sent } = await giftsApi.sendToAll(row.id);
    toast(`Presente enviado para ${sent} usuário(s)`);
    render();
  }

  async function remove(row) {
    const ok = await confirmDialog({
      title: 'Excluir presente',
      message: `Excluir "${row.name}"?`,
      danger: true,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    await giftsApi.remove(row.id);
    if (editingId === row.id) editingId = null;
    toast('Excluído', 'info');
    render();
  }

  page.append(host);
  render();
  return page;
}

function formatReward(r) {
  if (r.reward_type === 'produto_fisico') return r.reward_label || 'Prêmio físico';
  if (r.reward_type === 'partidas_gratis') return `${r.reward_value} partidas`;
  if (r.reward_type === 'bonus_aposta') return fmtMoney(r.reward_value) + ' p/ apostar';
  return fmtMoney(r.reward_value);
}

function inp(name, label, value, placeholder = '', type = 'text') {
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    el('input', {
      className: 'admin-input admin-input--sm',
      name,
      value: String(value ?? ''),
      type,
      placeholder,
    }),
  ]);
}

function sel(name, label, options, selected) {
  const s = el('select', { className: 'admin-select admin-input--sm', name });
  options.forEach((o) => s.append(el('option', { value: o, selected: o === selected ? 'selected' : undefined }, [o])));
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    s,
  ]);
}

function rewardTypeSel(name, selected) {
  const s = el('select', { className: 'admin-select admin-input--sm', name });
  GIFT_REWARD_TYPES.forEach(([v, l]) => {
    s.append(el('option', { value: v, selected: v === selected ? 'selected' : undefined }, [l]));
  });
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, ['Tipo de prêmio']),
    s,
  ]);
}

function triggerSel(name, selected) {
  const s = el('select', { className: 'admin-select admin-input--sm', name });
  GIFT_TRIGGER_TYPES.forEach(([v, l]) => {
    s.append(el('option', { value: v, selected: v === selected ? 'selected' : undefined }, [l]));
  });
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, ['Como liberar']),
    s,
  ]);
}

function couponSel(coupons, selectedId, selectedName) {
  const s = el('select', { className: 'admin-select admin-input--sm', name: 'coupon_id' });
  s.append(el('option', { value: '' }, ['— Nenhum —']));
  coupons.forEach((c) => {
    const sel = selectedId === c.id || (!selectedId && selectedName === c.name);
    s.append(el('option', { value: String(c.id), selected: sel ? 'selected' : undefined }, [
      `${c.name} (${c.type.replace(/_/g, ' ')})`,
    ]));
  });
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, ['Cupom vinculado (criado na aba Cupons)']),
    s,
  ]);
}

function chk(name, label, checked) {
  return el('label', { className: 'admin-field admin-field--check' }, [
    el('input', { type: 'checkbox', name, checked: !!checked }),
    el('span', { className: 'admin-field__label' }, [label]),
  ]);
}
