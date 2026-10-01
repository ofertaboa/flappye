import { el } from '../../shared/dom.js';
import { createBottomSheet, ModalHeader, ModalBody, ModalFooter } from '../ui/BottomSheet.js';
import { MoneyInput } from '../ui/MoneyInput.js';
import { PrimaryButton } from '../ui/PrimaryButton.js';
import {
  requestWithdraw,
  createFakeWithdraw,
  fetchFakeWithdrawals,
  PIX_KEY_TYPES,
} from '../api/withdraw.js';
import { fetchUserWallet, getLocalWallet } from '../api/user.js';
import { maskCpf, cpfDigits, formatMoney } from '../../shared/ui/format.js';
import { showToast } from '../../shared/ui/toast.js';

const FAKE_APPROVE_MS = 6000;

function historyRow(item) {
  const date = new Date(item.ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return el('div', {
    style: 'display:flex;align-items:center;justify-content:space-between;gap:10px;'
      + 'padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.05);margin-bottom:10px',
  }, [
    el('div', {}, [
      el('div', { style: 'font-weight:700;font-size:1.05rem' }, [formatMoney(item.amount)]),
      el('div', { style: 'font-size:12px;opacity:.6;margin-top:3px' }, [date]),
    ]),
    el('span', {
      style: 'background:rgba(46,204,113,0.16);color:#2ecc71;font-weight:700;'
        + 'font-size:12px;padding:6px 14px;border-radius:999px;white-space:nowrap',
    }, ['Aprovado']),
  ]);
}

export function WithdrawModal({ onSuccess, getRollover, getWallet } = {}) {
  const sheet = createBottomSheet({ titleId: 'withdraw-modal-title' });
  let pixType = 'CPF';

  // Estado descoberto pelo próprio modal (não depende do main.js).
  let isInfluencer = false;
  let walletInfoPromise = null;

  // ---- Janela separada: Histórico de saques ----
  const historySheet = createBottomSheet({ titleId: 'withdraw-history-title' });
  const historyListEl = el('div', {});
  const historyEmpty = el('p', {
    style: 'text-align:center;opacity:.6;padding:24px 0',
  }, ['Nenhum saque ainda.']);
  historySheet.header.append(ModalHeader({
    title: 'Histórico de saques',
    titleId: historySheet.titleId,
  }));
  historySheet.body.append(ModalBody([historyListEl, historyEmpty]));
  document.body.appendChild(historySheet.el);

  function renderHistoryList(items) {
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0) {
      historyListEl.replaceChildren();
      historyEmpty.style.display = 'block';
      return;
    }
    historyEmpty.style.display = 'none';
    historyListEl.replaceChildren(...list.map(historyRow));
  }

  async function openHistory(preItems) {
    if (preItems) renderHistoryList(preItems);
    else renderHistoryList([]);
    historySheet.open();
    const res = await fetchFakeWithdrawals();
    if (res.ok) renderHistoryList(res.withdrawals);
  }

  const rolloverBanner = el('p', {
    className: 'dash-form-hint dash-form-hint--warn',
    role: 'status',
    hidden: true,
  });

  const fakeStatusText = el('span', { className: 'dash-pix__status-text' }, ['Processando saque...']);
  const fakeStatus = el('div', { className: 'dash-pix__status', style: 'display:none' }, [
    el('span', { className: 'dash-pix__status-dot', 'aria-hidden': 'true' }),
    fakeStatusText,
  ]);

  const moneyInput = MoneyInput({ id: 'withdraw-amount', label: 'Valor' });

  const cpfInput = el('input', {
    className: 'dash-play__bet-input dash-field-input',
    id: 'withdraw-cpf',
    type: 'text',
    inputmode: 'numeric',
    placeholder: '000.000.000-00',
    autocomplete: 'off',
  });

  cpfInput.addEventListener('input', () => {
    cpfInput.value = maskCpf(cpfInput.value);
  });

  const pixKeyInput = el('input', {
    className: 'dash-play__bet-input dash-field-input',
    id: 'withdraw-pix-key',
    type: 'text',
    placeholder: 'Digite sua chave PIX',
    autocomplete: 'off',
  });

  const cpfGroup = el('div', { className: 'dash-field-group' }, [
    el('label', { className: 'dash-play__bet-label', for: 'withdraw-cpf' }, ['CPF']),
    cpfInput,
  ]);

  const typeWrap = el('div', { className: 'dash-pix-types' });
  const typeBtns = [];

  PIX_KEY_TYPES.forEach((type) => {
    const btn = el('button', {
      className: `dash-pix-type${type === pixType ? ' is-selected' : ''}`,
      type: 'button',
      onClick: () => {
        pixType = type;
        typeBtns.forEach((b) => b.classList.toggle('is-selected', b.dataset.type === type));
      },
      'data-type': type,
    }, [type]);
    typeBtns.push(btn);
    typeWrap.append(btn);
  });

  const errorEl = el('p', { className: 'dash-form-error', role: 'alert', hidden: true });

  // Link para reabrir o histórico quando quiser (só influenciador).
  const historyLink = el('button', {
    type: 'button',
    style: 'display:none;width:100%;background:none;border:none;color:#4ade80;'
      + 'font-weight:600;cursor:pointer;padding:12px 0;text-decoration:underline',
    onClick: () => openHistory(),
  }, ['Ver histórico de saques']);

  // Estas classes têm `display:flex` no CSS, que ignora o atributo `hidden`.
  // Por isso controlamos a visibilidade direto pelo style.display.
  function showFakeStatus(text) {
    fakeStatusText.textContent = text;
    fakeStatus.style.display = 'flex';
  }
  function hideFakeStatus() {
    fakeStatus.style.display = 'none';
  }
  function applyInfluencerUI() {
    cpfGroup.style.display = isInfluencer ? 'none' : 'flex';
    historyLink.style.display = isInfluencer ? 'block' : 'none';
  }

  function applyWalletInfo(info) {
    isInfluencer = Boolean(info?.is_influencer);
    applyInfluencerUI();
  }

  async function loadWalletInfo() {
    const ext = (typeof getWallet === 'function' ? getWallet() : null) || {};
    const local = getLocalWallet() || {};
    applyWalletInfo({ ...local, ...ext });

    try {
      const res = await fetchUserWallet();
      if (res?.ok && res.user) {
        applyWalletInfo({ ...local, ...ext, ...res.user });
      }
    } catch {
      /* mantém a melhor estimativa local */
    }

    // Sinal autoritativo: fake-withdraw.php responde OK somente para influenciador.
    // Não depende do me.php nem de cache, então corrige a detecção com segurança.
    try {
      const fw = await fetchFakeWithdrawals();
      if (fw.ok) {
        isInfluencer = true;
        applyInfluencerUI();
      }
    } catch {
      /* ignora */
    }

    return isInfluencer;
  }

  function ensureWalletInfo() {
    if (!walletInfoPromise) walletInfoPromise = loadWalletInfo();
    return walletInfoPromise;
  }

  function applyRolloverBanner() {
    const rollover = getRollover?.();
    const remaining = Number(rollover?.remaining ?? 0);
    if (remaining > 0 && !isInfluencer) {
      rolloverBanner.textContent = `Você ainda precisa movimentar R$ ${remaining.toFixed(2).replace('.', ',')} para poder sacar o saldo.`;
      rolloverBanner.hidden = false;
    } else {
      rolloverBanner.hidden = true;
    }
  }

  function validateInfluencerFields() {
    const amount = moneyInput.getValue();
    if (!amount || amount <= 0) return { error: 'Informe um valor válido para saque.' };
    if (pixKeyInput.value.trim() === '') return { error: 'Informe a chave PIX.' };
    return { amount };
  }

  async function runFakeApproval({ amount, setLoading }) {
    setLoading(true);
    fakeStatus.classList.remove('is-success');
    showFakeStatus('Processando saque...');

    const [res] = await Promise.all([
      createFakeWithdraw({
        amount,
        pix_key: pixKeyInput.value.trim(),
        pix_type: pixType,
      }),
      new Promise((resolve) => setTimeout(resolve, FAKE_APPROVE_MS)),
    ]);

    if (!res.ok) {
      hideFakeStatus();
      errorEl.textContent = res.error || 'Não foi possível concluir o saque.';
      errorEl.hidden = false;
      setLoading(false);
      return;
    }

    fakeStatusText.textContent = 'Saque aprovado!';
    fakeStatus.classList.add('is-success');
    showToast('Saque aprovado!');
    setLoading(false);

    // O valor sai da carteira (topo da tela), como se tivesse caído no PIX.
    if (typeof res.balance === 'number') {
      onSuccess?.({ balance: res.balance });
    }

    // Mostra "aprovado" por um instante, fecha o saque e abre a aba de histórico.
    setTimeout(() => {
      hideFakeStatus();
      sheet.close();
      openHistory(res.withdrawals);
    }, 1200);
  }

  const submitBtn = PrimaryButton({
    label: 'Solicitar Saque',
    onClick: async ({ setLoading }) => {
      errorEl.hidden = true;

      // Garante que já sabemos (confirmado pelo servidor) se é influenciador.
      await ensureWalletInfo();

      if (isInfluencer) {
        const { error, amount } = validateInfluencerFields();
        if (error) {
          errorEl.textContent = error;
          errorEl.hidden = false;
          return;
        }
        await runFakeApproval({ amount, setLoading });
        return;
      }

      setLoading(true);
      try {
        const res = await requestWithdraw({
          amount: moneyInput.getValue(),
          cpf: cpfDigits(cpfInput.value),
          pix_key: pixKeyInput.value.trim(),
          pix_type: pixType,
        });
        if (!res.ok) {
          errorEl.textContent = res.error || 'Erro ao solicitar saque.';
          errorEl.hidden = false;
          return;
        }
        showToast(res.message || 'Saque solicitado com sucesso.');
        if (res.balance != null) {
          onSuccess?.({ balance: res.balance });
        }
        sheet.close();
      } finally {
        setLoading(false);
      }
    },
  });

  sheet.header.append(ModalHeader({
    title: 'Solicitar saque',
    titleId: sheet.titleId,
  }));

  sheet.body.append(ModalBody([
    rolloverBanner,
    fakeStatus,
    moneyInput.root,
    cpfGroup,
    el('div', { className: 'dash-field-group' }, [
      el('label', { className: 'dash-play__bet-label' }, ['Chave PIX']),
      typeWrap,
      pixKeyInput,
    ]),
    errorEl,
    historyLink,
  ]));

  sheet.footer.append(ModalFooter([submitBtn.el]));

  const originalOpen = sheet.open;
  function open() {
    hideFakeStatus();
    fakeStatus.classList.remove('is-success');
    fakeStatusText.textContent = 'Processando saque...';
    errorEl.hidden = true;
    applyRolloverBanner();

    // Redescobre o status a cada abertura (fresco do servidor).
    walletInfoPromise = null;
    ensureWalletInfo().then(() => {
      applyRolloverBanner();
    });

    originalOpen();
  }

  return { el: sheet.el, open, close: sheet.close };
}
