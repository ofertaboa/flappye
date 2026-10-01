import { el, fmtMoney } from '../utils.js';
import { DataTable, StatusBadge, ActionBtn } from '../ui/table.js';
import { confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { couponsApi } from '../api/coupons.js';

const TYPES = [
  ['dobrar_deposito', 'Dobrar depósito'],
  ['bonus_fixo', 'Bônus fixo em dinheiro'],
  ['bonus_percentual', 'Bônus por porcentagem'],
  ['cashback', 'Cashback'],
  ['desconto_pix_pct', 'Desconto percentual no PIX'],
  ['desconto_pix_fixo', 'Desconto fixo no PIX'],
  ['partidas_gratis', 'Partidas grátis'],
];

export function renderCouponsPage() {
  const page = el('div', { className: 'admin-page' });
  const host = el('div');
  let editingId = null;
  const formHost = el('div');

  function buildForm(data = null) {
    editingId = data?.id || null;
    const form = el('form', { className: 'admin-inline-form' }, [
      el('h3', { className: 'admin-inline-form__title' }, [data ? `Editar cupom: ${data.name}` : 'Novo cupom']),
      el('div', { className: 'admin-form-grid admin-form-grid--dense' }, [
        inp('name', 'Código (nome)', data?.name || '', 'GANHE50'),
        typeSel('type', data?.type),
        inp('value', 'Valor', data?.value, '', 'number'),
        inp('min_deposit', 'Dep. mínimo', data?.min_deposit, '', 'number'),
        inp('max_deposit', 'Dep. máximo', data?.max_deposit, '0', 'number'),
        inp('max_qty', 'Máx. usos', data?.max_qty, '0', 'number'),
        inp('expires', 'Expiração', data?.expires, '', 'date'),
        statusSel('status', data?.status || 'ativo'),
      ]),
      el('div', { className: 'admin-inline-form__row', style: 'margin-top:0.45rem' }, [
        el('button', { className: 'admin-btn admin-btn--primary admin-btn--sm', type: 'submit' }, [data ? 'Salvar alterações' : 'Criar cupom']),
        data ? el('button', { className: 'admin-btn admin-btn--ghost admin-btn--sm', type: 'button', onClick: () => { editingId = null; render(); } }, ['Cancelar']) : null,
      ].filter(Boolean)),
    ]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      await couponsApi.save({
        id: editingId,
        name: fd.get('name'),
        type: fd.get('type'),
        value: Number(fd.get('value')),
        min_deposit: Number(fd.get('min_deposit')),
        max_deposit: Number(fd.get('max_deposit')),
        max_qty: Number(fd.get('max_qty')),
        expires: fd.get('expires'),
        status: fd.get('status'),
      });
      toast(editingId ? 'Cupom atualizado' : 'Cupom criado');
      editingId = null;
      render();
    });

    return form;
  }

  async function render() {
    try {
      const coupons = await couponsApi.list();
    formHost.replaceChildren(buildForm(editingId ? coupons.find((c) => c.id === editingId) : null));

    host.replaceChildren(
      formHost,
      el('div', { className: 'admin-panel admin-panel--compact' }, [
        el('div', { className: 'admin-panel__head' }, [
          el('h2', { className: 'admin-panel__title' }, ['Cupons cadastrados']),
        ]),
        DataTable({
          columns: [
            { key: 'name', label: 'Código' },
            { key: 'type', label: 'Tipo', render: (r) => typeLabel(r.type) },
            { key: 'value', label: 'Valor', render: (r) => el('span', { className: 'admin-money' }, [formatValue(r)]) },
            { key: 'min_deposit', label: 'Mín.', render: (r) => fmtMoney(r.min_deposit) },
            { key: 'max_qty', label: 'Usos', render: (r) => `${r.used_qty} / ${r.max_qty || '∞'}` },
            { key: 'expires', label: 'Expira' },
            { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
            {
              key: 'manager_name',
              label: 'Origem',
              render: (r) => r.manager_name || (r.manager_id ? 'Gerente' : 'Admin'),
            },
          ],
          rows: coupons,
          actions: (row) => [
            ActionBtn({ label: 'Editar', icon: '✎', onClick: () => { editingId = row.id; render(); } }),
            ActionBtn({ label: 'Excluir', icon: '✕', danger: true, onClick: () => remove(row) }),
          ],
        }),
      ]),
    );
    } catch (err) {
      toast(err.message || 'Erro ao carregar cupons', 'error');
    }
  }

  async function remove(row) {
    const ok = await confirmDialog({ title: 'Excluir', message: `Excluir ${row.name}?`, danger: true, confirmLabel: 'Excluir' });
    if (!ok) return;
    await couponsApi.remove(row.id);
    if (editingId === row.id) editingId = null;
    toast('Excluído', 'info');
    render();
  }

  page.append(host);
  render();
  return page;
}

function typeLabel(t) {
  return TYPES.find(([k]) => k === t)?.[1] || t;
}

function formatValue(r) {
  if (['bonus_percentual', 'cashback', 'desconto_pix_pct'].includes(r.type)) return `${r.value}%`;
  if (r.type === 'partidas_gratis') return `${r.value} partidas`;
  if (r.type === 'dobrar_deposito') return `${r.value}%`;
  return fmtMoney(r.value);
}

function inp(name, label, value, placeholder = '', type = 'text') {
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    el('input', { className: 'admin-input admin-input--sm', name, value: String(value ?? ''), type, placeholder }),
  ]);
}

function typeSel(name, selected) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name });
  TYPES.forEach(([v, l]) => sel.append(el('option', { value: v, selected: v === selected ? 'selected' : undefined }, [l])));
  return el('label', { className: 'admin-field' }, [el('span', { className: 'admin-field__label' }, ['Tipo']), sel]);
}

function statusSel(name, selected) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name });
  ['ativo', 'inativo'].forEach((o) => sel.append(el('option', { value: o, selected: o === selected ? 'selected' : undefined }, [o])));
  return el('label', { className: 'admin-field' }, [el('span', { className: 'admin-field__label' }, ['Status']), sel]);
}
