import { el } from '../../shared/dom.js';
import { createBottomSheet, ModalHeader, ModalBody } from '../ui/BottomSheet.js';
import { PrimaryButton } from '../ui/PrimaryButton.js';
import { formatMoney } from '../../shared/ui/format.js';
import { formatPhone } from '../../shared/phone.js';
import { changePassword, fetchUserWallet } from '../api/user.js';
import { showToast } from '../../shared/ui/toast.js';

function infoRow(label, value) {
  return el('div', { className: 'dash-profile-row' }, [
    el('span', { className: 'dash-profile-row__label' }, [label]),
    el('strong', { className: 'dash-profile-row__value' }, [value]),
  ]);
}

function fieldBlock(label, input) {
  return el('label', { className: 'dash-field' }, [
    el('span', { className: 'dash-play__bet-label' }, [label]),
    input,
  ]);
}

export function ProfileModal({ getUser } = {}) {
  const sheet = createBottomSheet({ titleId: 'profile-modal-title' });
  const content = el('div', { className: 'dash-profile-content' });

  const currentInput = el('input', {
    className: 'dash-play__bet-input dash-field-input',
    type: 'password',
    autocomplete: 'current-password',
    placeholder: 'Senha atual',
  });
  const newInput = el('input', {
    className: 'dash-play__bet-input dash-field-input',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Nova senha (mín. 6 caracteres)',
  });
  const confirmInput = el('input', {
    className: 'dash-play__bet-input dash-field-input',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Confirmar nova senha',
  });
  const passError = el('p', { className: 'dash-form-error', role: 'alert', hidden: true });

  sheet.header.append(ModalHeader({
    title: 'Meu Perfil',
    titleId: sheet.titleId,
  }));

  sheet.body.append(ModalBody([
    content,
    el('div', { className: 'dash-profile-pass' }, [
      el('h3', { className: 'dash-profile-section__title' }, ['Alterar senha']),
      fieldBlock('Senha atual', currentInput),
      fieldBlock('Nova senha', newInput),
      fieldBlock('Confirmar senha', confirmInput),
      passError,
      PrimaryButton({
        label: 'Salvar nova senha',
        full: true,
        onClick: async ({ setLoading }) => {
          passError.hidden = true;
          if (newInput.value.length < 6) {
            passError.textContent = 'A nova senha deve ter no mínimo 6 caracteres.';
            passError.hidden = false;
            return;
          }
          if (newInput.value !== confirmInput.value) {
            passError.textContent = 'As senhas não coincidem.';
            passError.hidden = false;
            return;
          }
          setLoading(true);
          try {
            await changePassword({
              currentPassword: currentInput.value,
              newPassword: newInput.value,
              confirmPassword: confirmInput.value,
            });
            showToast('Senha alterada com sucesso!');
            currentInput.value = '';
            newInput.value = '';
            confirmInput.value = '';
          } catch (err) {
            passError.textContent = err.message || 'Não foi possível alterar a senha.';
            passError.hidden = false;
          } finally {
            setLoading(false);
          }
        },
      }).el,
    ]),
  ]));

  async function renderProfile() {
    content.replaceChildren(el('p', { className: 'dash-muted' }, ['Carregando...']));

    let user = getUser?.() || {};
    if (localStorage.getItem('flappy_token')) {
      const res = await fetchUserWallet();
      if (res.ok && res.user) user = res.user;
    }

    const phone = user.phone ? formatPhone(user.phone) : '—';

    content.replaceChildren(
      el('div', { className: 'dash-profile-card' }, [
        el('div', { className: 'dash-profile-avatar' }, [
          (user.name || 'J')[0].toUpperCase(),
        ]),
        el('h3', { className: 'dash-profile-name' }, [user.name || 'Jogador']),
        el('p', { className: 'dash-profile-id' }, [`Conta #${user.id || '—'}`]),
      ]),
      el('div', { className: 'dash-profile-info' }, [
        infoRow('Telefone', phone),
        infoRow('Saldo disponível', formatMoney(user.balance ?? 0)),
        infoRow('Rodadas grátis', String(user.free_rounds ?? 0)),
      ]),
    );
  }

  function open() {
    sheet.open();
    renderProfile();
  }

  return { el: sheet.el, open, close: sheet.close };
}
