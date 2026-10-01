import { el, fmtMoney, fmtDateShort } from '../utils.js';
import { Pagination, SearchInput, StatusBadge } from '../ui/table.js';
import { toast } from '../ui/toast.js';
import { api } from '../mock/api.js';
import { usersApi } from '../api/users.js';
import { svgIcon } from '../ui/configCard.js';

const PAGE_SIZE = 15;

export function renderUsersPage() {
  const page = el('div', { className: 'admin-page' });
  const host = el('div');
  let users = [];
  let filtered = [];
  let currentPage = 1;
  let query = '';
  let selectedId = null;

  function whiteMoney(v) {
    return el('span', { className: 'admin-table-value' }, [fmtMoney(v)]);
  }

  function render() {
    if (selectedId) {
      host.replaceChildren(el('div', { className: 'admin-user-edit-host' }, [
        el('div', { className: 'admin-user-edit-loading' }, ['Carregando...']),
      ]));
      loadEditView(selectedId);
      return;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);

    const tbody = el('tbody', {}, slice.map((row) => {
      const tr = el('tr');
      [
        row.id,
        row.name,
        row.phone,
        whiteMoney(row.balance),
        whiteMoney(row.total_deposited),
        StatusBadge(row.status),
        el('button', {
          className: 'admin-link-btn',
          type: 'button',
          onClick: () => { selectedId = row.id; render(); },
        }, ['Editar']),
      ].forEach((cell) => {
        tr.append(el('td', {}, [cell instanceof Node ? cell : String(cell)]));
      });
      return tr;
    }));

    host.replaceChildren(
      el('div', { className: 'admin-panel admin-panel--compact' }, [
        el('div', { className: 'admin-panel__head' }, [
          el('div', { className: 'admin-panel__head-left' }, [
            el('h2', { className: 'admin-panel__title' }, ['Usuários']),
            el('span', { className: 'admin-muted-text' }, [`${filtered.length} cadastrados`]),
          ]),
          el('div', { className: 'admin-panel__head-right' }, [
            SearchInput({
              placeholder: 'Buscar nome ou telefone...',
              onSearch: (q) => { query = q; applyFilter(); render(); },
            }),
          ]),
        ]),
        el('div', { className: 'admin-table-wrap' }, [
          el('table', { className: 'admin-table admin-table--compact' }, [
            el('thead', {}, [el('tr', {}, ['ID', 'Nome', 'Telefone', 'Saldo', 'Total dep.', 'Status', ''].map((h) => el('th', {}, [h])))]),
            tbody,
          ]),
        ]),
        Pagination({
          page: currentPage,
          totalPages: Math.ceil(filtered.length / PAGE_SIZE) || 1,
          onPage: (p) => { currentPage = p; render(); },
        }),
      ]),
    );
  }

  async function loadEditView(userId) {
    try {
      const data = await usersApi.getEditData(userId);
      host.replaceChildren(buildEditView(data));
    } catch (err) {
      host.replaceChildren(el('div', { className: 'admin-alert admin-alert--error' }, [err.message]));
    }
  }

  function buildEditView(ctx) {
    const {
      user, referrals, depositors, montante, montanteTotal, referralLink,
      cpaTotal, revShare, montantePct, indicados, history, influencer,
      campaign, commissionEarned, partnershipStart,
    } = ctx;

    let isDemo = !!user.is_demo;
    let isInfluencer = !!user.is_influencer;
    let isBlocked = user.status === 'bloqueado';

    const balanceInput = el('input', {
      className: 'admin-input',
      type: 'number',
      step: '0.01',
      value: String(user.balance),
    });
    const passNewInput = el('input', {
      className: 'admin-input',
      type: 'password',
      placeholder: 'Nova senha',
      autocomplete: 'new-password',
    });
    const passConfirmInput = el('input', {
      className: 'admin-input',
      type: 'password',
      placeholder: 'Confirmar senha',
      autocomplete: 'new-password',
    });
    const passPanel = el('div', { className: 'admin-user-edit__pass-panel', hidden: true });
    const cpaInput = el('input', {
      className: 'admin-input',
      type: 'number',
      step: '0.01',
      value: String(user.cpa_per_referral ?? 0),
    });
    const cpaPhoneInput = el('input', {
      className: 'admin-input',
      type: 'tel',
      placeholder: '(11) 99999-9999',
    });

    const statReferralsVal = el('strong', { className: 'admin-user-stat__value' }, [String(referrals)]);
    const statMontanteVal = el('strong', { className: 'admin-user-stat__value' }, [fmtMoney(montanteTotal || montante)]);
    const statSaldoVal = el('strong', { className: 'admin-user-stat__value' }, [fmtMoney(user.balance)]);

    balanceInput.addEventListener('input', () => {
      statSaldoVal.textContent = fmtMoney(Number(balanceInput.value) || 0);
    });

    const demoCard = accountCard({
      title: 'Conta Demo',
      desc: 'Jogo fácil + R$ alto por moeda',
      icon: '🎮',
      iconTone: 'purple',
      active: isDemo,
      onClick: () => {
        if (isInfluencer) return;
        isDemo = !isDemo;
        refreshCards();
      },
    });

    const influencerCard = accountCard({
      title: 'Influenciador',
      desc: 'Ganha % de cada depósito dos indicados',
      icon: '⭐',
      iconTone: 'yellow',
      active: isInfluencer,
      onClick: () => {
        isInfluencer = !isInfluencer;
        if (isInfluencer) isDemo = true;
        refreshCards();
      },
    });

    const blockCard = accountCard({
      title: 'Bloquear',
      desc: 'Impede acesso à conta',
      icon: '🚫',
      iconTone: 'red',
      active: isBlocked,
      onClick: () => {
        isBlocked = !isBlocked;
        refreshCards();
      },
    });

    const cardsWrap = el('div', { className: 'admin-account-cards' }, [demoCard, influencerCard, blockCard]);

    const pctInput = el('input', {
      className: 'admin-input',
      type: 'number',
      min: '0',
      max: '100',
      step: '0.1',
      placeholder: '0',
      value: user.is_influencer && montantePct ? String(montantePct) : '',
    });

    const summaryMontante = el('span', {}, [fmtMoney(montanteTotal)]);
    const summaryPct = el('span', {}, ['0']);
    const summaryGain = el('strong', { className: 'admin-influencer-commission__gain' }, [fmtMoney(0)]);

    const campReferrals = el('strong', { className: 'admin-stat-mini__value' }, [String(referrals)]);
    const campDepositors = el('strong', { className: 'admin-stat-mini__value' }, [String(depositors)]);
    const campMontante = el('strong', { className: 'admin-stat-mini__value' }, [fmtMoney(montanteTotal)]);
    const campPct = el('strong', { className: 'admin-stat-mini__value' }, [`${montantePct || 0}%`]);
    const campCommission = el('strong', { className: 'admin-stat-mini__value admin-stat-mini__value--live' }, [fmtMoney(commissionEarned)]);

    function updateCommissionSummary() {
      const pct = Number(pctInput.value) || 0;
      const gain = montanteTotal * (pct / 100);
      summaryPct.textContent = `${pct}%`;
      summaryGain.textContent = fmtMoney(gain);
      campPct.textContent = `${pct}%`;
      campCommission.textContent = fmtMoney(gain);
      statMontanteVal.textContent = fmtMoney(montanteTotal);
    }

    pctInput.addEventListener('input', () => {
      updateCommissionSummary();
      if (isInfluencer) buildTrackingSection();
    });
    updateCommissionSummary();

    const commissionCard = el('div', { className: 'admin-influencer-commission' }, [
      el('div', { className: 'admin-influencer-commission__head' }, [
        el('span', { className: 'admin-influencer-commission__icon', 'aria-hidden': 'true' }, ['💜']),
        el('strong', {}, ['Comissão de influenciador']),
      ]),
      el('label', { className: 'admin-config-field' }, [
        el('span', { className: 'admin-config-field__label' }, ['% do montante total dos indicados']),
        pctInput,
        el('span', { className: 'admin-config-field__hint' }, [
          'Ex: 10% sobre cada depósito PIX dos indicados (montante = total já depositado)',
        ]),
      ]),
      el('div', { className: 'admin-influencer-commission__summary' }, [
        el('p', {}, ['Montante dos indicados: ', summaryMontante]),
        el('p', {}, ['Comissão configurada: ', summaryPct]),
        summaryGain,
        el('span', { className: 'admin-influencer-commission__gain-label' }, [
          'ganho estimado sobre o montante atual',
        ]),
      ]),
    ]);

    const commissionWrap = el('div', { className: 'admin-user-edit__commission-wrap', hidden: !isInfluencer }, [commissionCard]);

    const campaignPanel = el('div', { className: 'admin-panel admin-panel--compact admin-user-edit__campaign', hidden: !isInfluencer }, [
      el('h3', { className: 'admin-user-edit__section-title' }, ['Campanha atual']),
      el('div', { className: 'admin-stats admin-stats--5 admin-stats--inline admin-user-edit__campaign-stats' }, [
        campaignStatMini('Indicados', campReferrals),
        campaignStatMini('Depositantes', campDepositors),
        campaignStatMini('Montante', campMontante),
        campaignStatMini('Percentual', campPct),
        campaignStatMini('Comissão', campCommission),
      ]),
      partnershipStart
        ? el('p', { className: 'admin-user-edit__campaign-since' }, [
          'Parceria ativa desde ', fmtDateShort(partnershipStart),
        ])
        : null,
    ].filter(Boolean));

    const linkBar = el('div', { className: 'admin-user-edit__bar' }, [
      el('span', { className: 'admin-user-edit__bar-label' }, ['Link de indicação: ']),
      el('a', { href: referralLink, target: '_blank', rel: 'noopener', className: 'admin-user-edit__link' }, [referralLink]),
    ]);

    const commissionBar = el('div', { className: 'admin-user-edit__bar admin-user-edit__bar--muted' }, [
      el('span', { className: 'admin-user-edit__bar-label' }, ['Comissão de indicação: ']),
      `CPA ${fmtMoney(cpaTotal)} · Rev. share ${fmtMoney(revShare)}`,
    ]);

    const cpaFieldWrap = el('div', { className: 'admin-user-edit__cpa-field', hidden: isInfluencer }, [
      fieldBlock('CPA por indicado — usuário normal (R$)', cpaInput, 'Valor fixo no 1º depósito do indicado. 0 = usar padrão do painel.'),
    ]);

    const influencerTracking = el('div', { className: 'admin-user-edit__tracking', hidden: !isInfluencer });

    function buildTrackingSection() {
      const timelineItems = [];

      if (isInfluencer) {
        timelineItems.push(partnershipStep({
          title: 'Campanha em andamento',
          active: true,
          lines: [
            `${referrals} indicados · ${depositors} depositantes`,
            `Montante ${fmtMoney(montanteTotal)} · Comissão ${campCommission.textContent}`,
          ],
          date: partnershipStart ? fmtDateShort(partnershipStart) : '—',
        }));
      }

      history.slice(0, 5).forEach((h, i) => {
        timelineItems.push(partnershipStep({
          title: `Parceria encerrada #${history.length - i}`,
          active: false,
          lines: [
            `${h.referrals} indicados · ${h.depositors ?? 0} depositantes`,
            `Montante ${fmtMoney(h.montante_value)} · ${h.montante_pct}%`,
          ],
          date: `${fmtDateShort(h.start_date)} — ${fmtDateShort(h.end_date)}`,
        }));
      });

      influencerTracking.replaceChildren(
        el('div', { className: 'admin-user-edit__tracking-head' }, [
          el('h3', { className: 'admin-user-edit__section-title' }, ['Indicados e histórico']),
          influencer
            ? el('a', {
              className: 'admin-link-btn',
              href: '#influencers',
              onClick: (e) => { e.preventDefault(); window.location.hash = 'influencers'; },
            }, ['Ver gestão completa →'])
            : null,
        ].filter(Boolean)),

        el('div', { className: 'admin-panel admin-panel--compact admin-user-edit__tracking-panel' }, [
          el('h4', { className: 'admin-user-edit__tracking-sub' }, [`Indicados (${indicados.length})`]),
          indicados.length
            ? el('div', { className: 'admin-table-wrap' }, [
              el('table', { className: 'admin-table admin-table--compact' }, [
                el('thead', {}, [el('tr', {}, ['Nome', 'Telefone', 'Depósito', 'Comissão', 'Data'].map((h) => el('th', {}, [h])))]),
                el('tbody', {}, indicados.map((r) => el('tr', {}, [
                  el('td', {}, [r.name]),
                  el('td', {}, [r.phone || '—']),
                  el('td', {}, [fmtMoney(r.deposit)]),
                  el('td', {}, [fmtMoney(r.commission)]),
                  el('td', {}, [fmtDateShort(r.date)]),
                ]))),
              ]),
            ])
            : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhum indicado registrado ainda.']),
        ]),

        el('div', { className: 'admin-panel admin-panel--compact admin-user-edit__tracking-panel' }, [
          el('h4', { className: 'admin-user-edit__tracking-sub' }, ['Etapas da parceria']),
          timelineItems.length
            ? el('div', { className: 'admin-partnership-timeline' }, timelineItems)
            : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhuma etapa registrada.']),
        ]),

        el('div', { className: 'admin-panel admin-panel--compact admin-user-edit__tracking-panel' }, [
          el('h4', { className: 'admin-user-edit__tracking-sub' }, ['Histórico de parcerias']),
          history.length
            ? el('div', { className: 'admin-table-wrap' }, [
              el('table', { className: 'admin-table admin-table--compact' }, [
                el('thead', {}, [el('tr', {}, ['Início', 'Fim', 'Indicados', 'Depositantes', 'Movimentado', 'Montante', '%'].map((h) => el('th', {}, [h])))]),
                el('tbody', {}, history.map((r) => el('tr', {}, [
                  el('td', {}, [fmtDateShort(r.start_date)]),
                  el('td', {}, [fmtDateShort(r.end_date)]),
                  el('td', {}, [String(r.referrals)]),
                  el('td', {}, [String(r.depositors ?? 0)]),
                  el('td', {}, [fmtMoney(r.volume ?? 0)]),
                  el('td', {}, [fmtMoney(r.montante_value)]),
                  el('td', {}, [`${r.montante_pct}%`]),
                ]))),
              ]),
            ])
            : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhuma campanha encerrada.']),
        ]),
      );
    }

    function refreshCards() {
      demoCard.classList.toggle('is-active', isDemo);
      demoCard.classList.toggle('is-locked', isInfluencer);
      influencerCard.classList.toggle('is-active', isInfluencer);
      blockCard.classList.toggle('is-active', isBlocked);
      commissionWrap.hidden = !isInfluencer;
      campaignPanel.hidden = !isInfluencer;
      cpaFieldWrap.hidden = isInfluencer;
      influencerTracking.hidden = !isInfluencer;
      if (isInfluencer) {
        isDemo = true;
        statReferralsVal.textContent = String(referrals);
        buildTrackingSection();
      } else {
        statReferralsVal.textContent = '0';
        statMontanteVal.textContent = fmtMoney(0);
      }
    }

    async function saveAll() {
      const montantePctVal = Number(pctInput.value);
      if (isInfluencer && (pctInput.value === '' || Number.isNaN(montantePctVal))) {
        toast('Informe o percentual do montante', 'error');
        return;
      }

      try {
        const updated = await usersApi.update(user.id, {
          status: isBlocked ? 'bloqueado' : 'ativo',
          balance: Number(balanceInput.value),
          is_influencer: isInfluencer,
          montante_pct: isInfluencer ? montantePctVal : undefined,
        });

        toast(`Saldo atualizado: ${fmtMoney(updated.balance)}`);
        await reload();
      } catch (err) {
        toast(err.message || 'Erro ao salvar', 'error');
      }
    }

    async function changePassword() {
      if (!passNewInput.value || passNewInput.value.length < 4) {
        toast('Senha deve ter ao menos 4 caracteres', 'error');
        return;
      }
      if (passNewInput.value !== passConfirmInput.value) {
        toast('Senhas não coincidem', 'error');
        return;
      }
      await usersApi.updatePassword(user.id, passNewInput.value);
      passNewInput.value = '';
      passConfirmInput.value = '';
      passPanel.hidden = true;
      toast('Senha alterada');
    }

    passPanel.append(
      el('div', { className: 'admin-user-edit__pass-grid' }, [
        fieldBlock('Nova senha', passNewInput),
        fieldBlock('Confirmar senha', passConfirmInput),
      ]),
      el('button', {
        className: 'admin-btn admin-btn--primary admin-btn--sm',
        type: 'button',
        onClick: changePassword,
      }, ['Alterar senha']),
    );

    refreshCards();

    const initial = (user.name || '?')[0].toUpperCase();

    const mudarSenhaBtn = el('button', {
      className: 'admin-btn admin-btn--ghost admin-btn--sm admin-user-edit__pass-toggle',
      type: 'button',
      onClick: () => { passPanel.hidden = !passPanel.hidden; },
    }, ['Mudar senha']);

    return el('div', { className: 'admin-user-edit' }, [
      el('div', { className: 'admin-user-edit__header' }, [
        el('div', { className: 'admin-user-edit__avatar admin-user-edit__avatar--green' }, [initial]),
        el('div', { className: 'admin-user-edit__identity' }, [
          el('h2', { className: 'admin-user-edit__name' }, [user.name]),
          el('p', { className: 'admin-user-edit__phone' }, [user.phone || user.email || '—']),
        ]),
        el('div', { className: 'admin-user-edit__header-actions' }, [mudarSenhaBtn]),
      ]),
      passPanel,

      el('div', { className: 'admin-user-edit__stats' }, [
        statMiniNode(statReferralsVal, 'Indicados'),
        statMiniNode(statMontanteVal, 'Montante'),
        statMiniNode(statSaldoVal, 'Saldo'),
      ]),

      el('h3', { className: 'admin-user-edit__section-title' }, ['Tipo de conta']),
      cardsWrap,

      fieldBlock('Saldo da conta (R$)', balanceInput),
      commissionWrap,
      cpaFieldWrap,

      linkBar,
      commissionBar,
      campaignPanel,
      influencerTracking,

      el('div', { className: 'admin-user-edit__actions' }, [
        el('button', {
          className: 'admin-btn admin-btn--primary admin-btn--save',
          type: 'button',
          onClick: saveAll,
        }, [svgIcon('save', 18), 'Salvar alterações']),
        el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--back',
          type: 'button',
          onClick: () => { selectedId = null; render(); },
        }, [
          el('svg', { viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
            el('path', { d: 'M19 12H5M12 19l-7-7 7-7' }),
          ]),
          ' Voltar à lista',
        ]),
      ]),

      el('div', { className: 'admin-user-edit__cpa-box' }, [
        el('p', { className: 'admin-user-edit__cpa-text' }, [
          'Se um indicado depositou e o afiliado não recebeu CPA, informe o telefone do indicado:',
        ]),
        el('div', { className: 'admin-user-edit__cpa-row' }, [
          el('label', { className: 'admin-config-field admin-config-field--grow' }, [
            el('span', { className: 'admin-config-field__label' }, ['Telefone do indicado (convidado)']),
            cpaPhoneInput,
          ]),
          el('button', {
            className: 'admin-btn admin-btn--ghost',
            type: 'button',
            onClick: async () => {
              try {
                await api.recreditCpa(user.id, cpaPhoneInput.value.trim());
                toast('CPA recreditado (mock)');
                cpaPhoneInput.value = '';
              } catch (err) {
                toast(err.message, 'error');
              }
            },
          }, ['Recreditar CPA']),
        ]),
      ]),
    ]);
  }

  function statMiniNode(valueEl, label) {
    return el('div', { className: 'admin-user-stat' }, [
      valueEl,
      el('span', { className: 'admin-user-stat__label' }, [label]),
    ]);
  }

  function campaignStatMini(label, valueEl) {
    return el('div', { className: 'admin-stat-mini' }, [
      el('span', { className: 'admin-stat-mini__label' }, [label]),
      valueEl,
    ]);
  }

  function partnershipStep({ title, active, lines, date }) {
    return el('div', { className: `admin-partnership-step${active ? ' is-active' : ''}` }, [
      el('div', { className: 'admin-partnership-step__dot' }),
      el('div', { className: 'admin-partnership-step__body' }, [
        el('strong', { className: 'admin-partnership-step__title' }, [title]),
        el('span', { className: 'admin-partnership-step__date' }, [date]),
        ...lines.map((line) => el('p', { className: 'admin-partnership-step__line' }, [line])),
      ]),
    ]);
  }

  function accountCard({ title, desc, icon, iconTone, active, onClick }) {
    const card = el('button', {
      type: 'button',
      className: `admin-account-card admin-account-card--${iconTone}${active ? ' is-active' : ''}`,
      onClick,
    }, [
      el('span', { className: 'admin-account-card__icon' }, [icon]),
      el('span', { className: 'admin-account-card__title' }, [title]),
      el('span', { className: 'admin-account-card__desc' }, [desc]),
    ]);
    return card;
  }

  function fieldBlock(label, control, hint) {
    return el('label', { className: 'admin-config-field' }, [
      el('span', { className: 'admin-config-field__label' }, [label]),
      control,
      hint ? el('span', { className: 'admin-config-field__hint' }, [hint]) : null,
    ].filter(Boolean));
  }

  function applyFilter() {
    filtered = users.filter((u) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.phone.includes(q);
    });
    currentPage = 1;
  }

  async function reload() {
    try {
      users = await usersApi.list();
    } catch (err) {
      toast(err.message || 'Erro ao carregar usuários', 'error');
      users = [];
    }
    applyFilter();
    if (selectedId) await loadEditView(selectedId);
    else render();
  }

  page.append(host);
  reload();
  return page;
}
