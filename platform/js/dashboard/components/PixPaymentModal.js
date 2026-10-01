import { el } from '../../shared/dom.js';
import { createBottomSheet, ModalHeader, ModalBody } from '../ui/BottomSheet.js';
import { PrimaryButton } from '../ui/PrimaryButton.js';
import { PixCountdown, PixStatusWaiting, PixQrBox } from '../ui/PixCountdown.js';
import { formatMoney } from '../../shared/ui/format.js';
import { showToast } from '../../shared/ui/toast.js';
import { getDepositStatus } from '../api/deposit.js';

function PixInstructions() {
  const steps = [
    'Escaneie o QR Code ou copie o código PIX',
    'Abra seu banco ou carteira',
    'Confirme o pagamento',
  ];

  return el('ol', { className: 'dash-pix__steps' }, steps.map((text) =>
    el('li', { className: 'dash-pix__step' }, [text]),
  ));
}

export function PixPaymentModal({ onPaid } = {}) {
  const sheet = createBottomSheet({ titleId: 'pix-modal-title' });
  sheet.el.classList.add('dash-sheet--pix');

  let countdown = null;
  let pixCode = '';
  let pollTimer = null;
  let depositId = null;
  let settled = false;
  let pollInFlight = false;

  const metaBlock = el('div', { className: 'dash-pix__meta' });
  const amountEl = el('p', { className: 'dash-pix__amount' }, ['']);
  const codeEl = el('code', { className: 'dash-pix__code' }, ['']);
  const statusEl = PixStatusWaiting();
  const qrBox = PixQrBox({ size: 168 });

  const copyBtn = PrimaryButton({
    label: '📋 Copiar Código PIX',
    onClick: async ({ setLoading }) => {
      setLoading(true);
      try {
        await navigator.clipboard.writeText(pixCode);
        showToast('Código copiado.');
      } catch {
        showToast('Não foi possível copiar.', { type: 'error' });
      } finally {
        setLoading(false);
      }
    },
  });

  sheet.header.append(ModalHeader({
    title: 'Pagamento via PIX',
    titleId: sheet.titleId,
    extra: metaBlock,
  }));

  sheet.body.append(ModalBody([
    el('div', { className: 'dash-pix__qr-block' }, [
      qrBox.wrap,
      el('div', { className: 'dash-pix__code-wrap' }, [
        el('span', { className: 'dash-play__bet-label' }, ['Código PIX']),
        codeEl,
      ]),
    ]),
    PixInstructions(),
    copyBtn.el,
    statusEl,
    el('p', { className: 'dash-pix__info' }, [
      'Após confirmar o pagamento, seu saldo será creditado automaticamente.',
    ]),
  ]));

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function handlePaid(res) {
    if (settled) return;
    settled = true;
    stopPolling();
    countdown?.stop();

    statusEl.textContent = 'Depósito confirmado!';
    statusEl.classList.add('is-success');

    onPaid?.({ balance: res.balance, amount: res.amount });
    showToast('Depósito confirmado!');
    sheet.close();
  }

  async function pollStatus() {
    if (!depositId || settled || pollInFlight) return;

    pollInFlight = true;
    try {
      const res = await getDepositStatus(depositId);
      if (settled) return;

      if (res.status === 'aprovado') {
        handlePaid(res);
      } else if (res.status === 'recusado' || res.status === 'expirado') {
        settled = true;
        stopPolling();
        showToast('Pagamento não concluído. Gere um novo PIX.', { type: 'error' });
      }
    } catch {
      /* continua tentando */
    } finally {
      pollInFlight = false;
    }
  }

  async function open({
    amount,
    pixCode: code,
    pixQrImage = '',
    expiresIn = 900,
    depositId: id,
    reused = false,
  }) {
    pixCode = String(code || '').trim();
    depositId = id ?? null;
    settled = false;
    pollInFlight = false;
    amountEl.textContent = `Valor: ${formatMoney(amount)}`;
    codeEl.textContent = pixCode;
    statusEl.textContent = reused
      ? 'PIX já gerado — conclua o pagamento abaixo.'
      : 'Aguardando pagamento...';
    statusEl.classList.remove('is-success');

    stopPolling();
    if (countdown) countdown.stop();
    countdown = PixCountdown({
      minutes: Math.ceil(expiresIn / 60),
      compact: true,
      onExpire: () => {
        if (settled) return;
        stopPolling();
        showToast('Pagamento expirado. Gere um novo PIX.', { type: 'error' });
      },
    });
    metaBlock.replaceChildren(countdown.root, amountEl);
    countdown.start();

    if (depositId) {
      // Poll rápido: na hospedagem o webhook credita e a tela detecta em ~1s.
      pollTimer = window.setInterval(pollStatus, 1000);
      window.setTimeout(pollStatus, 400);
    }

    sheet.open();

    void qrBox.render(pixCode, pixQrImage).then((qrOk) => {
      if (!qrOk && pixCode) {
        showToast('Não foi possível gerar o QR Code. Use o código PIX abaixo.', { type: 'error' });
      }
    });
  }

  function close() {
    stopPolling();
    countdown?.stop();
    sheet.close();
  }

  return { el: sheet.el, open, close };
}
