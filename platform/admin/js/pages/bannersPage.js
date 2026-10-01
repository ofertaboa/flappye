import { el } from '../utils.js';
import { DataTable, ActionBtn, StatusBadge } from '../ui/table.js';
import { confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { bannersApi } from '../api/banners.js';
import { appUrl, assetUrl } from '../../../js/shared/paths.js';

const ACTIONS = [
  ['none', 'Nenhuma (só exibir)'],
  ['deposit', 'Abrir depósito'],
  ['gifts', 'Abrir presentes'],
  ['play', 'Abrir jogo'],
  ['referral', 'Abrir indique e ganhe'],
  ['url', 'Link externo'],
];

export function renderBannersPage() {
  const page = el('div', { className: 'admin-page admin-page--banners' });
  const host = el('div');
  let editingId = null;
  let specs = {};
  let banners = [];

  function previewSrc(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return assetUrl(u.replace(/^\//, '').replace(/^\.\.\//, ''));
  }

  function buildSpecsPanel() {
    const w = specs.recommended_width || 1200;
    const h = specs.recommended_height || 500;
    const minW = specs.min_width || 960;
    const minH = specs.min_height || 400;

    return el('div', { className: 'admin-panel admin-panel--compact admin-banner-specs' }, [
      el('h2', { className: 'admin-panel__title' }, ['Tamanho das imagens']),
      el('div', { className: 'admin-banner-specs__grid' }, [
        specBox('Recomendado', `${w} × ${h} px`, 'Proporção 2.4:1 — encaixa perfeito no carrossel'),
        specBox('Mínimo', `${minW} × ${minH} px`, 'Abaixo disso pode ficar pixelado no desktop'),
        specBox('Formatos', 'JPG, PNG ou WebP', 'Máximo 2 MB por arquivo'),
        specBox('Área segura', 'Texto no centro', 'Bordas podem ser cortadas em telas menores (object-fit: cover)'),
      ]),
      el('p', { className: 'admin-hint' }, [
        'O banner ocupa toda a largura do dashboard (até ~1120 px) com altura automática pela proporção 2.4:1. ',
        'Crie no Canva/Figma com canvas ',
        el('strong', {}, [`${w}×${h} px`]),
        ' e exporte em boa qualidade.',
      ]),
    ]);
  }

  function specBox(title, value, hint) {
    return el('div', { className: 'admin-banner-spec' }, [
      el('span', { className: 'admin-banner-spec__label' }, [title]),
      el('strong', { className: 'admin-banner-spec__value' }, [value]),
      el('span', { className: 'admin-banner-spec__hint' }, [hint]),
    ]);
  }

  function buildForm(data = null) {
    editingId = data?.id || null;
    let imageUrl = data?.image_url || '';
    const preview = el('img', {
      className: 'admin-banner-preview',
      alt: 'Prévia',
      hidden: true,
    });
    const fileInput = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true });
    const urlInput = el('input', {
      className: 'admin-input admin-input--sm',
      name: 'image_url',
      value: imageUrl,
      placeholder: 'uploads/banners/arquivo.png ou URL https://...',
    });

    function updatePreview() {
      const src = previewSrc(urlInput.value);
      if (src) {
        preview.src = src;
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    }

    urlInput.addEventListener('input', updatePreview);
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const res = await bannersApi.uploadImage(file);
        imageUrl = res.image_url;
        urlInput.value = imageUrl;
        updatePreview();
        toast('Imagem enviada');
      } catch (err) {
        toast(err.message, 'error');
      }
      fileInput.value = '';
    });

    const form = el('form', { className: 'admin-panel admin-panel--compact admin-banner-form' }, [
      el('h3', { className: 'admin-panel__title' }, [data ? `Editar banner #${data.id}` : 'Novo banner promocional']),
      el('div', { className: 'admin-form-grid admin-form-grid--dense' }, [
        field('title', 'Título (acessibilidade / alt)', data?.title || '', 'Promoção de verão'),
        actionSelect('action', data?.action || 'none'),
        field('action_url', 'URL externa (se ação = link)', data?.action_url || '', 'https://...'),
        field('sort_order', 'Ordem', data?.sort_order ?? (banners.length + 1), '', 'number'),
        statusSelect('status', data?.status || 'ativo'),
      ]),
      el('div', { className: 'admin-banner-form__image' }, [
        el('label', { className: 'admin-field' }, [
          el('span', { className: 'admin-field__label' }, ['Imagem']),
          urlInput,
        ]),
        el('div', { className: 'admin-banner-form__image-actions' }, [
          el('button', {
            className: 'admin-btn admin-btn--ghost admin-btn--sm',
            type: 'button',
            onClick: () => fileInput.click(),
          }, ['Enviar arquivo']),
          el('span', { className: 'admin-muted-text' }, [`Ideal: ${specs.recommended_width || 1200}×${specs.recommended_height || 500} px`]),
        ]),
        preview,
      ]),
      el('div', { className: 'admin-inline-form__row' }, [
        el('button', { className: 'admin-btn admin-btn--primary admin-btn--sm', type: 'submit' }, [
          data ? 'Salvar alterações' : 'Criar banner',
        ]),
        data ? el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => { editingId = null; render(); },
        }, ['Cancelar']) : null,
      ].filter(Boolean)),
    ]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await bannersApi.save({
          id: editingId,
          title: fd.get('title'),
          image_url: fd.get('image_url'),
          action: fd.get('action'),
          action_url: fd.get('action_url'),
          sort_order: Number(fd.get('sort_order')),
          status: fd.get('status'),
        });
        toast(editingId ? 'Banner atualizado' : 'Banner criado');
        editingId = null;
        render();
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    updatePreview();
    return form;
  }

  async function render() {
    try {
      const data = await bannersApi.list();
      banners = data.banners;
      specs = data.specs;
      const editing = editingId ? banners.find((b) => b.id === editingId) : null;

      host.replaceChildren(
        buildSpecsPanel(),
        buildForm(editing),
        el('div', { className: 'admin-panel admin-panel--compact' }, [
          el('div', { className: 'admin-panel__head' }, [
            el('h2', { className: 'admin-panel__title' }, ['Banners do carrossel']),
            el('span', { className: 'admin-muted-text' }, [
              `${banners.filter((b) => b.status === 'ativo').length} ativo(s) · ordem crescente`,
            ]),
          ]),
          banners.length
            ? DataTable({
              columns: [
                {
                  key: 'image_url',
                  label: 'Prévia',
                  render: (r) => el('img', {
                    className: 'admin-banner-thumb',
                    src: previewSrc(r.image_url),
                    alt: r.title,
                    loading: 'lazy',
                  }),
                },
                { key: 'title', label: 'Título' },
                { key: 'action', label: 'Ação', render: (r) => actionLabel(r.action) },
                { key: 'sort_order', label: 'Ordem' },
                { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
              ],
              rows: banners,
              actions: (row) => [
                ActionBtn({ label: 'Editar', icon: '✎', onClick: () => { editingId = row.id; render(); } }),
                ActionBtn({ label: 'Excluir', icon: '✕', danger: true, onClick: () => remove(row) }),
              ],
            })
            : el('p', { className: 'admin-empty' }, ['Nenhum banner cadastrado.']),
        ]),
      );
    } catch (err) {
      host.replaceChildren(el('div', { className: 'admin-alert admin-alert--error' }, [err.message]));
    }
  }

  async function remove(row) {
    const ok = await confirmDialog({
      title: 'Excluir banner',
      message: `Excluir "${row.title}"?`,
      danger: true,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    await bannersApi.remove(row.id);
    if (editingId === row.id) editingId = null;
    toast('Banner excluído', 'info');
    render();
  }

  page.append(host);
  render();
  return page;
}

function actionLabel(action) {
  return ACTIONS.find(([k]) => k === action)?.[1] || action;
}

function field(name, label, value, placeholder = '', type = 'text') {
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    el('input', {
      className: 'admin-input admin-input--sm',
      name,
      type,
      value: String(value ?? ''),
      placeholder,
      required: name === 'title',
    }),
  ]);
}

function actionSelect(name, selected) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name });
  ACTIONS.forEach(([value, label]) => {
    sel.append(el('option', { value, selected: value === selected ? 'selected' : undefined }, [label]));
  });
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, ['Ao clicar']),
    sel,
  ]);
}

function statusSelect(name, selected) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name });
  ['ativo', 'inativo'].forEach((value) => {
    sel.append(el('option', { value, selected: value === selected ? 'selected' : undefined }, [value]));
  });
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, ['Status']),
    sel,
  ]);
}
