/** Catálogo público de presentes (admin → jogador via localStorage) */

const STORAGE_KEY = 'flappy_gifts_public';
const SETTINGS_KEY = 'flappy_gifts_settings';

const DEFAULT_SETTINGS = {
  gifts_enabled: true,
};

const DEFAULT_CATALOG = [
  {
    id: 1,
    titulo: 'Bônus de Boas-vindas',
    descricao: 'R$50 para novos jogadores.',
    tipo: 'saldo',
    valor: 50,
    imagem: null,
    icon: '🎁',
    status: 'disponivel',
    resgatado: false,
    progress: 0,
    progress_target: 0,
    progress_label: '',
  },
  {
    id: 2,
    titulo: '10 partidas grátis',
    descricao: 'Jogue sem usar seu saldo.',
    tipo: 'partidas_gratis',
    valor: 10,
    imagem: null,
    icon: '🎮',
    status: 'disponivel',
    resgatado: false,
    progress: 0,
    progress_target: 0,
    progress_label: '',
  },
  {
    id: 3,
    titulo: 'Deposite 5 vezes',
    descricao: 'Ganhe R$100 para apostar.',
    tipo: 'saldo',
    valor: 100,
    imagem: null,
    icon: '💰',
    status: 'em_andamento',
    resgatado: false,
    progress: 2,
    progress_target: 5,
    progress_label: 'depósitos',
  },
];

export function getGiftSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

export function setGiftSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...getGiftSettings(), ...settings }));
}

export function getPublicGifts() {
  const settings = getGiftSettings();
  if (!settings.gifts_enabled) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length) return list;
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_CATALOG];
}

export function setPublicGifts(gifts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gifts));
}

export function syncPublicGiftsFromAdmin(gifts, userAssignments = []) {
  const settings = getGiftSettings();
  if (!settings.gifts_enabled) {
    setPublicGifts([]);
    return;
  }

  const active = gifts.filter((g) => g.status === 'ativo');
  const publicList = active.flatMap((gift) => {
    const assignments = userAssignments.filter((a) => a.gift_id === gift.id);
    if (assignments.length) {
      return assignments.map((a) => giftToPublic(gift, a));
    }
    if (['broadcast', 'todos_usuarios', 'novo_usuario', 'manual'].includes(gift.trigger_type)) {
      return [giftToPublic(gift, { progress: 0, progress_target: gift.milestone_count || 0, status: 'disponivel' })];
    }
    if (gift.trigger_type === 'marco_deposito' || gift.trigger_type === 'marco_deposito_qtd') {
      return [giftToPublic(gift, {
        progress: gift.demo_progress ?? 0,
        progress_target: gift.milestone_count || 1,
        status: (gift.demo_progress ?? 0) >= (gift.milestone_count || 1) ? 'disponivel' : 'em_andamento',
      })];
    }
    if (gift.trigger_type === 'cupom_deposito') {
      return [giftToPublic(gift, { progress: 0, progress_target: 1, status: 'em_andamento' })];
    }
    return [giftToPublic(gift, {})];
  });

  setPublicGifts(publicList);
}

function giftToPublic(gift, assignment) {
  const target = assignment.progress_target ?? gift.milestone_count ?? 0;
  const progress = assignment.progress ?? 0;
  const done = target > 0 && progress >= target;

  return {
    id: assignment.id ?? gift.id,
    gift_campaign_id: gift.id,
    titulo: gift.name,
    descricao: gift.description,
    tipo: gift.reward_type,
    valor: gift.reward_value,
    reward_label: gift.reward_label || '',
    imagem: gift.image_url || null,
    icon: gift.icon || '🎁',
    status: assignment.status || (done ? 'disponivel' : (target > 0 ? 'em_andamento' : 'disponivel')),
    resgatado: assignment.status === 'resgatado',
    progress,
    progress_target: target,
    progress_label: gift.milestone_label || 'depósitos',
    coupon_code: gift.coupon_name || '',
  };
}
