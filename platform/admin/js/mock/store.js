/** Mock data store — prepared for DB integration */

function daysAgo(n, hours = 12) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hours, rand(0, 59), 0, 0);
  return d.toISOString();
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const users = [
  { id: 1, name: 'João Silva', cpf: '123.456.789-00', phone: '(11) 99988-7766', balance: 150, total_deposited: 500, total_withdrawn: 350, created_at: daysAgo(14), last_access: daysAgo(0), status: 'ativo', is_influencer: false, is_demo: false, email: 'joao@email.com' },
  { id: 2, name: 'Maria Santos', cpf: '987.654.321-00', phone: '(21) 98877-6655', balance: 320, total_deposited: 1200, total_withdrawn: 880, created_at: daysAgo(60), last_access: daysAgo(1), status: 'ativo', is_influencer: true, is_demo: true, montante_pct: 50, email: 'maria@email.com', instagram: '@mariasantos', referral_code: 'MARIA20' },
  { id: 3, name: 'Carlos Oliveira', cpf: '', phone: '(31) 97766-5544', balance: 0, total_deposited: 100, total_withdrawn: 0, created_at: daysAgo(3), last_access: daysAgo(3), status: 'bloqueado', is_influencer: false, is_demo: false, email: 'carlos@email.com' },
  { id: 4, name: 'Ana Costa', cpf: '', phone: '(41) 96655-4433', balance: 85, total_deposited: 300, total_withdrawn: 0, created_at: daysAgo(2), last_access: daysAgo(2), status: 'ativo', is_influencer: false, is_demo: false, email: 'ana@email.com' },
  { id: 5, name: 'Pedro Lima', cpf: '789.123.456-00', phone: '(51) 95544-3322', balance: 420, total_deposited: 2000, total_withdrawn: 1580, created_at: daysAgo(1), last_access: daysAgo(0), status: 'ativo', is_influencer: false, is_demo: false, email: 'pedro@email.com' },
  { id: 6, name: 'Juliana Reis', cpf: '', phone: '(11) 97755-4433', balance: 50, total_deposited: 50, total_withdrawn: 0, created_at: daysAgo(0, 9), last_access: daysAgo(0, 8), status: 'ativo', is_influencer: false, is_demo: false, email: 'juliana@email.com' },
];

function userName(userId) {
  return users.find((x) => x.id === userId)?.name || '—';
}

function userById(userId) {
  return users.find((x) => x.id === userId);
}

const deposits = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  user_id: rand(1, 6),
  user_name: '',
  gateway: ['Mercado Pago', 'Pushin Pay', 'OpenPix', 'SuitPay'][rand(0, 3)],
  amount: [20, 30, 50, 100, 200][rand(0, 4)],
  fee: 0,
  net: 0,
  status: i < 5 ? ['aprovado', 'pendente', 'aprovado', 'pendente', 'aprovado'][i] : ['aprovado', 'pendente', 'recusado'][rand(0, 2)],
  created_at: i < 5 ? daysAgo(0, 23 - i) : daysAgo(rand(0, 29)),
})).map((d) => {
  d.fee = +(d.amount * 0.03).toFixed(2);
  d.net = +(d.amount - d.fee).toFixed(2);
  d.user_name = userName(d.user_id);
  return d;
});

const withdrawals = Array.from({ length: 25 }, (_, i) => {
  const u = userById(rand(1, 6));
  return {
    id: i + 1,
    user_id: u?.id || 1,
    user_name: u?.name || '—',
    cpf: u?.cpf || (u?.total_withdrawn > 0 ? 'Informado no saque' : '—'),
    phone: u?.phone || '—',
    pix_key: u?.phone?.replace(/\D/g, '') || '00000000000',
    gateway: 'PIX',
    amount: [50, 100, 150, 200][rand(0, 3)],
    fee: 2,
    net: 0,
    type: i === 0 ? 'influenciador' : 'usuario',
    status: ['pendente', 'aprovado', 'recusado'][rand(0, 2)],
    created_at: daysAgo(rand(0, 29)),
  };
}).map((w) => {
  w.net = w.amount - w.fee;
  return w;
});

function newCampaign(startDate = new Date().toISOString()) {
  return {
    start_date: startDate,
    referrals: 0,
    depositors: 0,
    volume: 0,
    montante_value: 0,
    montante_pct: 50,
    commission: 0,
  };
}

const influencers = [
  {
    id: 1,
    user_id: 2,
    name: 'Maria Santos',
    instagram: '@mariasantos',
    code: 'MARIA20',
    link: 'https://flappycopa.com/?ref=MARIA20',
    montante_pct: 50,
    montante_value: 840,
    montante_balance: 420,
    referrals: 45,
    depositors: 28,
    status: 'ativo',
    campaign: {
      start_date: daysAgo(30),
      referrals: 45,
      depositors: 28,
      volume: 8400,
      montante_value: 840,
      montante_pct: 50,
      commission: 420,
    },
    history: [
      {
        id: 1,
        start_date: daysAgo(120),
        end_date: daysAgo(31),
        referrals: 32,
        depositors: 18,
        volume: 5200,
        montante_pct: 40,
        montante_value: 520,
      },
    ],
  },
];

export const store = {
  users,
  deposits,
  withdrawals,

  gateways: [
    { id: 1, name: 'Mercado Pago', status: 'ativo', api_key: 'mp_test_****', secret_key: '****', webhook: 'https://seudominio.com/api/webhook/mp', env: 'sandbox' },
    { id: 2, name: 'Pushin Pay', status: 'inativo', api_key: '', secret_key: '', webhook: '', env: 'sandbox' },
    { id: 3, name: 'OpenPix', status: 'ativo', api_key: 'op_****', secret_key: '****', webhook: 'https://seudominio.com/api/webhook/openpix', env: 'producao' },
  ],

  gifts: [
    {
      id: 1, name: 'Boas-vindas', description: 'R$50 para novos usuários', image_url: '', icon: '🎁',
      reward_type: 'saldo', reward_value: 50, reward_label: '', trigger_type: 'novo_usuario',
      milestone_count: 0, milestone_label: 'depósitos', coupon_id: null, coupon_name: '',
      qty: 1000, qty_used: 342, start: '2026-01-01', end: '2026-12-31', expires_days: 7,
      rollover: 1, is_default_new_user: true, status: 'ativo', demo_progress: 0,
    },
    {
      id: 2, name: '10 Partidas Grátis', description: 'Partidas sem usar saldo', image_url: '', icon: '🎮',
      reward_type: 'partidas_gratis', reward_value: 10, reward_label: '', trigger_type: 'primeiro_deposito',
      milestone_count: 1, milestone_label: 'depósitos', coupon_id: null, coupon_name: '',
      qty: 500, qty_used: 120, start: '2026-03-01', end: '2026-06-30', expires_days: 3,
      rollover: 2, is_default_new_user: false, status: 'ativo', demo_progress: 0,
    },
    {
      id: 3, name: 'Deposite 5 vezes — R$100', description: 'Faça 5 depósitos e ganhe R$100 para apostar.',
      image_url: '', icon: '💰', reward_type: 'bonus_aposta', reward_value: 100, reward_label: '',
      trigger_type: 'marco_deposito_qtd', milestone_count: 5, milestone_label: 'depósitos',
      coupon_id: null, coupon_name: '', qty: 0, qty_used: 89, start: '2026-01-01', end: '2026-12-31',
      expires_days: 14, rollover: 2, is_default_new_user: false, status: 'ativo', demo_progress: 2,
    },
    {
      id: 4, name: 'iPhone 17 Pro Max', description: 'Deposite 700 vezes e concorra ao prêmio máximo.',
      image_url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=200&h=200&fit=crop',
      icon: '📱', reward_type: 'produto_fisico', reward_value: 0, reward_label: 'iPhone 17 Pro Max',
      trigger_type: 'marco_deposito_qtd', milestone_count: 700, milestone_label: 'depósitos',
      coupon_id: null, coupon_name: '', qty: 1, qty_used: 0, start: '2026-01-01', end: '2026-12-31',
      expires_days: 30, rollover: 0, is_default_new_user: false, status: 'ativo', demo_progress: 45,
    },
    {
      id: 5, name: 'Presente cupom GANHE50', description: 'Use o cupom GANHE50 no depósito e receba este presente.',
      image_url: '', icon: '🎟', reward_type: 'saldo', reward_value: 25, reward_label: '',
      trigger_type: 'cupom_deposito', milestone_count: 1, milestone_label: 'depósito com cupom',
      coupon_id: 1, coupon_name: 'GANHE50', qty: 200, qty_used: 45, start: '2026-01-01', end: '2026-12-31',
      expires_days: 5, rollover: 1, is_default_new_user: false, status: 'ativo', demo_progress: 0,
    },
  ],

  gift_settings: {
    gifts_enabled: true,
  },

  user_gifts: [],

  coupons: [
    { id: 1, name: 'GANHE50', type: 'bonus_fixo', value: 50, min_deposit: 30, max_deposit: 500, max_qty: 500, used_qty: 89, expires: '2026-03-31', status: 'ativo' },
    { id: 2, name: 'VIP10', type: 'cashback', value: 10, min_deposit: 100, max_deposit: 0, max_qty: 100, used_qty: 23, expires: '2026-12-31', status: 'ativo' },
    { id: 3, name: 'DOBRAR', type: 'dobrar_deposito', value: 100, min_deposit: 20, max_deposit: 200, max_qty: 0, used_qty: 12, expires: '2026-06-30', status: 'ativo' },
  ],

  influencers,

  settings: {
    game_name: 'Flappy Copa',
    maintenance: false,
    difficulty: 'medio',
    min_deposit: 15,
    min_withdraw: 20,
    max_withdraw: 5000,
    rollover_default: 1,
    rollover_gift: 2,
    rollover_referral: 1,
    referral_commission: 20,
    referral_reward: 20,
    referral_min_deposit: 20,
    cashback_pct: 5,
    welcome_bonus: 50,
    win_per_pipe: 0.5,
    demo_win_per_pipe: 1,
    influencer_win_per_pipe: 0.8,
    lives: 3,
    protection_time: 2,
    min_bet: 5,
    max_bet: 100,
    influencer_montante_pct_default: 50,
    influencer_montante_initial: 0,
    influencer_default_mode: 'demo',
  },

  userHistory: {
    deposits: (userId) => deposits.filter((d) => d.user_id === userId).slice(0, 10),
    withdrawals: (userId) => withdrawals.filter((w) => w.user_id === userId).slice(0, 10),
    matches: () => Array.from({ length: 8 }, (_, i) => ({
      id: i + 1, bet: [5, 10, 20][rand(0, 2)], result: ['ganhou', 'perdeu'][rand(0, 1)],
      profit: rand(-20, 80), date: daysAgo(rand(0, 14)),
    })),
    gifts: () => [{ name: 'Bônus de Boas-vindas', date: daysAgo(5), status: 'resgatado' }],
    coupons: () => [{ code: 'GANHE50', date: daysAgo(10), status: 'utilizado' }],
    referrals: (userId) => {
      if (userId === 2) {
        return [
          { name: 'Lucas M.', phone: '(11) 98765-4321', deposit: 50, date: daysAgo(7), commission: 20 },
          { name: 'Fernanda R.', phone: '(21) 97654-3210', deposit: 120, date: daysAgo(3), commission: 60 },
          { name: 'Rafael S.', phone: '(31) 96543-2109', deposit: 80, date: daysAgo(1), commission: 40 },
        ];
      }
      return [];
    },
  },
};

export { newCampaign };

let nextIds = { user: 10, deposit: 100, withdrawal: 100, gateway: 10, gift: 10, coupon: 10, influencer: 10, campaign: 10 };
export function nextId(key) {
  nextIds[key] += 1;
  return nextIds[key];
}

export function inRange(iso, range) {
  const d = new Date(iso);
  return d >= range.start && d <= range.end;
}

export function chartBuckets(range, count = 7) {
  const labels = [];
  const ms = range.end - range.start;
  const step = ms / Math.max(count - 1, 1);
  for (let i = 0; i < count; i++) {
    const d = new Date(range.start.getTime() + step * i);
    labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  }
  return labels;
}

export function aggregateByPeriod(items, range, field = 'amount', count = 7) {
  const labels = chartBuckets(range, count);
  const buckets = labels.map(() => 0);
  const ms = range.end - range.start;
  const step = ms / Math.max(count - 1, 1);
  items.filter((it) => inRange(it.created_at, range)).forEach((it) => {
    const t = new Date(it.created_at).getTime() - range.start.getTime();
    const idx = Math.min(count - 1, Math.max(0, Math.floor(t / step)));
    buckets[idx] += it[field] || 1;
  });
  return { labels, data: buckets };
}

export function depositsSum(range, status = 'aprovado') {
  return store.deposits.filter((d) => inRange(d.created_at, range) && d.status === status)
    .reduce((s, d) => s + d.amount, 0);
}

export function withdrawalsSum(range) {
  return store.withdrawals.filter((w) => inRange(w.created_at, range) && w.status === 'aprovado')
    .reduce((s, w) => s + w.amount, 0);
}

export function usersRegistered(range) {
  return store.users.filter((u) => inRange(u.created_at || u.last_access, range)).length
    || store.users.length;
}

export function difficultyLabel(d) {
  const map = { facil: 'Fácil', easy: 'Fácil', medio: 'Médio', normal: 'Médio', dificil: 'Difícil', hard: 'Difícil' };
  return map[d] || d;
}
