import { el } from '../utils.js';
import { DataTable, StatusBadge, ActionBtn } from '../ui/table.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { gatewaysApi } from '../api/gateways.js';
import { showLoading, hideLoading } from '../ui/loading.js';

const GATEWAY_OPTIONS = [
  { slug: 'pixup', name: 'Pixup', defaultUrl: 'https://api.pixupbr.com' },
  { slug: 'veopag', name: 'VeoPag', defaultUrl: 'https://api.veopag.com' },
  { slug: 'actuxpay', name: 'ActuX Pay', defaultUrl: 'https://api.actuxpay.com/api/v1' },
];

export function renderGatewaysPage() {
  const page = el('div', { className: 'admin-page' });
  const tableHost = el('div');
  let gateways = [];

  async function refresh() {
    showLoading();
    try {
      gateways = mergeGatewayRows(await gatewaysApi.list());
      render();
    } catch (err) {
      toast(err.message || 'Erro ao carregar gateways', 'error');
      gateways = [];
      render();
    } finally {
      hideLoading();
    }
  }

  function render() {
    tableHost.replaceChildren(DataTable({
      columns: [
        { key: 'name', label: 'Gateway' },
        { key: 'api_base_url', label: 'URL base da API' },
        { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
        {
          key: 'is_primary',
          label: 'Em uso',
          render: (r) => (r.is_primary && r.status === 'ativo'
            ? el('span', { className: 'admin-badge admin-badge--success' }, ['Depósito + Saque'])
            : '—'),
        },
      ],
      rows: gateways,
      actions: (row) => [
        ActionBtn({
          label: row.client_id ? 'Editar' : 'Configurar',
          icon: row.client_id ? '✎' : '+',
          onClick: () => openForm(row),
        }),
      ],
    }));
  }

  function openForm(data = null) {
    const slug = data?.slug || GATEWAY_OPTIONS[0].slug;
    const defaults = GATEWAY_OPTIONS.find((g) => g.slug === slug) || GATEWAY_OPTIONS[0];
    const isNew = !data?.client_id;

    const form = el('form', { className: 'admin-form-grid' }, [
      gatewaySelect(slug, !!data && !isNew),
      inputField('client_id', 'Client ID', data?.client_id || '', 'text', true),
      inputField(
        'client_secret',
        'Client Secret',
        data?.client_secret === '****' ? '' : (data?.client_secret || ''),
        'password',
        !data,
      ),
      inputField(
        'api_base_url',
        'URL base da API',
        data?.api_base_url || defaults.defaultUrl,
        'url',
        true,
      ),
      selectField('status', 'Status', ['ativo', 'inativo'], data?.status || 'inativo'),
      checkboxField('is_primary', 'Usar este gateway para depósitos e saques', data?.is_primary ?? true),
      el('p', { className: 'admin-field-hint admin-field--full' }, [
        data
          ? 'Ao editar, deixe o Client Secret em branco para manter o atual.'
          : 'Preencha Client ID, Client Secret e a URL base fornecida pelo provedor.',
        ' O gateway ativo gera PIX (depósito) e processa saques.',
      ]),
    ]);

    const slugSelect = form.querySelector('[name=slug]');
    const urlInput = form.querySelector('[name=api_base_url]');
    slugSelect?.addEventListener('change', () => {
      const opt = GATEWAY_OPTIONS.find((g) => g.slug === slugSelect.value);
      if (opt && urlInput && !data) {
        urlInput.value = opt.defaultUrl;
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const slugValue = String(data?.slug || fd.get('slug') || '').trim();
      const selected = GATEWAY_OPTIONS.find((g) => g.slug === slugValue);

      if (!slugValue) {
        toast('Selecione um gateway válido.', 'error');
        return;
      }

      try {
        await gatewaysApi.save({
          slug: slugValue,
          name: selected?.name || slugValue,
          client_id: String(fd.get('client_id') || '').trim(),
          client_secret: String(fd.get('client_secret') || ''),
          api_base_url: String(fd.get('api_base_url') || '').trim(),
          status: fd.get('status') || 'inativo',
          is_primary: fd.get('is_primary') === 'on',
        });
        toast(data ? 'Gateway atualizado' : 'Gateway salvo');
        modal.close();
        refresh();
      } catch (err) {
        toast(err.message || 'Erro ao salvar', 'error');
      }
    });

    const modal = openModal({
      title: data && !isNew ? `Editar ${data.name}` : `Configurar ${defaults.name}`,
      body: form,
      footer: el('button', { className: 'admin-btn admin-btn--primary', type: 'submit' }, ['Salvar']),
    });
    modal.panel.querySelector('[type=submit]').addEventListener('click', (e) => {
      e.preventDefault();
      form.requestSubmit();
    });
  }

  page.append(
    el('div', { className: 'admin-panel' }, [
      el('div', { className: 'admin-panel__head' }, [
        el('h2', { className: 'admin-panel__title' }, ['Gateways PIX']),
        el('button', {
          className: 'admin-btn admin-btn--primary admin-btn--sm',
          type: 'button',
          onClick: () => openForm(),
        }, ['Configurar gateway']),
      ]),
      el('p', { className: 'admin-panel__hint' }, [
        'Cadastre Client ID, Client Secret e URL base da API. Um gateway ativo serve para depósito e saque.',
      ]),
      tableHost,
    ]),
  );

  refresh();
  return page;
}

function inputField(name, label, value, type = 'text', required = false) {
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    el('input', {
      className: 'admin-input',
      name,
      value,
      type,
      autocomplete: 'off',
      ...(required ? { required: 'required' } : {}),
    }),
  ]);
}

function selectField(name, label, options, selected) {
  const sel = el('select', { className: 'admin-select', name });
  options.forEach((o) => sel.append(el('option', { value: o, selected: o === selected ? 'selected' : undefined }, [o])));
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    sel,
  ]);
}

function gatewaySelect(selectedSlug, locked) {
  const sel = el('select', {
    className: 'admin-select',
    name: locked ? undefined : 'slug',
    disabled: locked ? 'disabled' : undefined,
    'aria-disabled': locked ? 'true' : undefined,
  });
  GATEWAY_OPTIONS.forEach((g) => {
    sel.append(el('option', { value: g.slug, selected: g.slug === selectedSlug ? 'selected' : undefined }, [g.name]));
  });

  const children = [
    el('span', { className: 'admin-field__label' }, ['Provedor']),
    sel,
  ];

  if (locked) {
    children.push(el('input', { type: 'hidden', name: 'slug', value: selectedSlug }));
  }

  return el('label', { className: 'admin-field' }, children);
}

function checkboxField(name, label, checked) {
  return el('label', { className: 'admin-field admin-field--checkbox' }, [
    el('input', { type: 'checkbox', name, ...(checked ? { checked: 'checked' } : {}) }),
    el('span', { className: 'admin-field__label' }, [label]),
  ]);
}

/** Lista fixa de provedores + dados salvos no banco (ActuX Pay sempre visível). */
function mergeGatewayRows(rows) {
  const bySlug = Object.fromEntries((rows || []).map((g) => [g.slug, g]));

  return GATEWAY_OPTIONS.map((opt) => {
    const saved = bySlug[opt.slug];
    if (!saved) {
      return {
        slug: opt.slug,
        name: opt.name,
        api_base_url: opt.defaultUrl,
        status: 'inativo',
        is_primary: false,
        client_id: '',
        client_secret: '',
      };
    }

    return saved;
  });
}
