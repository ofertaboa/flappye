import { el } from '../../shared/dom.js';
import { createNavIcon } from '../../shared/navIcons.js';
import { createBottomSheet, ModalHeader, ModalBody, ModalFooter } from '../ui/BottomSheet.js';
import { MoneyInput, CouponInput } from '../ui/MoneyInput.js';
import { QuickValueGroup } from '../ui/QuickValueButton.js';
import { PrimaryButton } from '../ui/PrimaryButton.js';
import { createDeposit, redirectToLogin } from '../api/deposit.js';

const QUICK_VALUES = [15, 20, 50, 100];

const DEPOSIT_ICON = createNavIcon('deposit', { wrap: false });
DEPOSIT_ICON.classList.add('dash-sheet__deposit-svg');

export function DepositModal({ onOpenPix }) {
  const sheet = createBottomSheet({ titleId: 'deposit-modal-title' });
  let selectedAmount = 0;
  let couponCode = '';
  let paying = false;

  const moneyInput = MoneyInput({
    id: 'deposit-amount',
    label: 'Digite o valor',
    onChange: (v) => {
      selectedAmount = v;
      quickGroup.setSelected(v);
    },
  });

  const quickGroup = QuickValueGroup({
    values: QUICK_VALUES,
    selected: 0,
    onSelect: (v) => moneyInput.setValue(v),
  });

  const coupon = CouponInput({
    onApply: (code) => { couponCode = code; },
  });

  const errorEl = el('p', { className: 'dash-form-error', role: 'alert', hidden: true });

  const payBtn = PrimaryButton({
    label: 'Realizar Pagamento',
    onClick: async ({ setLoading }) => {
      if (paying) return;
      errorEl.hidden = true;
      const amount = moneyInput.getValue();
      if (!amount || amount < 1) {
        errorEl.textContent = 'Informe um valor válido para depósito.';
        errorEl.hidden = false;
        return;
      }
      paying = true;
      setLoading(true);
      try {
        const res = await createDeposit({ amount, coupon: couponCode || undefined });
        if (res.needsLogin) {
          errorEl.textContent = res.error || 'Faça login para depositar.';
          errorEl.hidden = false;
          window.setTimeout(() => redirectToLogin(), 1200);
          return;
        }
        if (!res.ok) {
          errorEl.textContent = res.error || 'Erro ao gerar pagamento.';
          errorEl.hidden = false;
          return;
        }
        if (!String(res.pix_code || '').trim()) {
          errorEl.textContent = 'PIX gerado sem código de pagamento. Verifique o gateway.';
          errorEl.hidden = false;
          return;
        }
        try {
          await onOpenPix?.({
            amount: res.amount,
            pixCode: res.pix_code,
            pixQrImage: res.pix_qr_image || '',
            expiresIn: res.expires_in,
            depositId: res.deposit_id,
            reused: res.reused,
          });
          sheet.close();
        } catch {
          errorEl.textContent = 'Não foi possível abrir a tela de pagamento PIX.';
          errorEl.hidden = false;
        }
      } catch {
        errorEl.textContent = 'Não foi possível iniciar o pagamento. Tente novamente.';
        errorEl.hidden = false;
      } finally {
        paying = false;
        setLoading(false);
      }
    },
  });

  sheet.header.append(ModalHeader({
    icon: DEPOSIT_ICON,
    iconClass: 'dash-sheet__icon dash-sheet__icon--deposit',
    title: 'Adicionar saldo',
    subtitle: 'Adicione saldo para jogar e concorrer aos prêmios.',
    titleId: sheet.titleId,
  }));

  sheet.body.append(ModalBody([
    el('div', { className: 'dash-field-group' }, [
      quickGroup.el,
      moneyInput.root,
    ]),
    coupon.root,
    errorEl,
  ]));

  sheet.footer.append(ModalFooter([payBtn.el]));

  return { el: sheet.el, open: sheet.open, close: sheet.close };
}
