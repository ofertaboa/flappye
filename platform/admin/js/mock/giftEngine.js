import { syncPublicGiftsFromAdmin, setGiftSettings, getGiftSettings } from '../../../js/shared/giftPublic.js';

export const GIFT_REWARD_TYPES = [
  ['saldo', 'Saldo (R$)'],
  ['partidas_gratis', 'Partidas grátis'],
  ['bonus_aposta', 'Bônus para apostar (R$)'],
  ['produto_fisico', 'Produto físico / prêmio'],
  ['cashback', 'Cashback'],
];

export const GIFT_TRIGGER_TYPES = [
  ['marco_deposito_qtd', 'Marco: quantidade de depósitos'],
  ['marco_deposito_valor', 'Marco: valor total depositado'],
  ['cupom_deposito', 'Cupom: ao depositar com cupom'],
  ['broadcast', 'Enviar manualmente p/ todos'],
  ['todos_usuarios', 'Disponível para todos (automático)'],
  ['novo_usuario', 'Novos usuários'],
  ['primeiro_deposito', 'Primeiro depósito'],
  ['manual', 'Atribuição manual'],
];

export function normalizeGift(data) {
  return {
    id: data.id,
    name: String(data.name || '').trim(),
    description: String(data.description || '').trim(),
    image_url: String(data.image_url || '').trim(),
    icon: String(data.icon || '🎁').trim() || '🎁',
    reward_type: data.reward_type || 'saldo',
    reward_value: Number(data.reward_value ?? data.value ?? 0),
    reward_label: String(data.reward_label || '').trim(),
    trigger_type: data.trigger_type || data.condition || 'manual',
    milestone_count: Number(data.milestone_count ?? 0),
    milestone_label: String(data.milestone_label || 'depósitos').trim(),
    coupon_id: data.coupon_id ? Number(data.coupon_id) : null,
    coupon_name: String(data.coupon_name || '').trim(),
    qty: Number(data.qty ?? 0),
    qty_used: Number(data.qty_used ?? 0),
    rollover: Number(data.rollover ?? 1),
    start: data.start || '',
    end: data.end || '',
    expires_days: Number(data.expires_days ?? 7),
    is_default_new_user: Boolean(data.is_default_new_user),
    status: data.status === 'inativo' ? 'inativo' : 'ativo',
    demo_progress: Number(data.demo_progress ?? 0),
  };
}

export function syncGiftsToPlayer(store) {
  setGiftSettings({ gifts_enabled: store.gift_settings?.gifts_enabled !== false });
  syncPublicGiftsFromAdmin(store.gifts, store.user_gifts || []);
}

export function assignGiftToAllUsers(store, giftId) {
  const gift = store.gifts.find((g) => g.id === giftId);
  if (!gift) throw new Error('Presente não encontrado');

  store.user_gifts = store.user_gifts || [];
  let sent = 0;

  store.users.forEach((user) => {
    const exists = store.user_gifts.some((ug) => ug.gift_id === giftId && ug.user_id === user.id && ug.status !== 'resgatado');
    if (exists) return;

    store.user_gifts.push({
      id: nextUserGiftId(store),
      gift_id: giftId,
      user_id: user.id,
      progress: 0,
      progress_target: gift.milestone_count || 0,
      status: gift.milestone_count > 0 ? 'em_andamento' : 'disponivel',
      assigned_at: new Date().toISOString(),
    });
    sent += 1;
  });

  gift.qty_used = (gift.qty_used || 0) + sent;
  syncGiftsToPlayer(store);
  return { sent, gift };
}

function nextUserGiftId(store) {
  store._userGiftSeq = (store._userGiftSeq || 1000) + 1;
  return store._userGiftSeq;
}

export function getGiftSettingsFromStore(store) {
  return getGiftSettings();
}
