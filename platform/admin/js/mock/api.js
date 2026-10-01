import {
  store, nextId, inRange, aggregateByPeriod,
  depositsSum, withdrawalsSum, usersRegistered, difficultyLabel, newCampaign,
} from './store.js';
import {
  normalizeGift, syncGiftsToPlayer, assignGiftToAllUsers,
} from './giftEngine.js';
import { setGiftSettings } from '../../../js/shared/giftPublic.js';

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const MONTANTE_PCTS = [30, 40, 50, 60, 70, 80, 90, 100];

function indicadosCount(userId) {
  return store.userHistory.referrals(userId).length;
}

function ensureReferralCode(user) {
  if (!user.referral_code) {
    const prefix = (user.name?.split(' ')[0] || 'USER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    user.referral_code = `${prefix}${randCode()}${user.id}`.toUpperCase().slice(0, 12);
  }
  return user.referral_code;
}

export const api = {
  async getDashboard(range) {
    await delay();
    const paid = aggregateByPeriod(store.deposits.filter((d) => d.status === 'aprovado'), range, 'amount');
    const pending = aggregateByPeriod(store.deposits.filter((d) => d.status === 'pendente'), range, 'amount');
    const s = store.settings;

    return {
      usersCount: usersRegistered(range),
      deposited: depositsSum(range, 'aprovado'),
      withdrawn: withdrawalsSum(range),
      lastDeposits: [...store.deposits].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
      lastUsers: [...store.users].sort((a, b) => new Date(b.created_at || b.last_access) - new Date(a.created_at || a.last_access)).slice(0, 5),
      depositChart: { labels: paid.labels, paid: paid.data, pending: pending.data },
      platform: {
        difficulty: difficultyLabel(s.difficulty),
        rollover: s.rollover_default,
        referralCommission: s.referral_commission,
        winPerPipe: s.win_per_pipe,
        status: s.maintenance ? 'Manutenção' : 'Online',
      },
    };
  },

  async getUsers() {
    await delay();
    return [...store.users];
  },

  async getUser(id) {
    await delay();
    return store.users.find((u) => u.id === id) || null;
  },

  async getUserEditData(id) {
    await delay();
    const user = store.users.find((u) => u.id === id);
    if (!user) throw new Error('Usuário não encontrado');
    const inf = store.influencers.find((i) => i.user_id === id);
    const code = ensureReferralCode(user);
    const baseUrl = 'https://flappycopa.com/?ref=';
    const montanteTotal = inf?.campaign?.montante_value ?? inf?.montante_value ?? 0;
    const pct = user.is_influencer
      ? (user.montante_pct ?? inf?.montante_pct ?? 0)
      : 0;
    const campaign = inf?.campaign ?? null;
    const commissionEarned = inf?.montante_balance ?? campaign?.commission ?? 0;
    return {
      user,
      influencer: inf || null,
      campaign,
      referrals: inf?.referrals ?? campaign?.referrals ?? indicadosCount(id),
      depositors: inf?.depositors ?? campaign?.depositors ?? 0,
      montante: inf?.montante_balance ?? montanteTotal,
      montanteTotal,
      commissionEarned,
      referralLink: `${baseUrl}${code}`,
      cpaTotal: user.cpa_total ?? campaign?.commission ?? 0,
      revShare: user.rev_share ?? 0,
      montantePct: pct,
      indicados: store.userHistory.referrals(id),
      history: inf?.history ?? [],
      partnershipStart: campaign?.start_date ?? inf?.created_at ?? user.created_at,
    };
  },

  async recreditCpa(userId, phone) {
    await delay();
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 10) throw new Error('Telefone inválido');
    const u = store.users.find((x) => x.id === userId);
    if (!u) throw new Error('Usuário não encontrado');
    return { ok: true, phone: digits };
  },

  async updateUser(id, data) {
    await delay();
    const u = store.users.find((x) => x.id === id);
    if (!u) throw new Error('Usuário não encontrado');
    Object.assign(u, data);
    return u;
  },

  async updateUserPassword(id, password) {
    await delay();
    const u = store.users.find((x) => x.id === id);
    if (!u) throw new Error('Usuário não encontrado');
    if (!password || password.length < 4) throw new Error('Senha deve ter ao menos 4 caracteres');
    u._password = password;
    return u;
  },

  async deleteUser(id) {
    await delay();
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Usuário não encontrado');
    store.users.splice(idx, 1);
  },

  async blockUser(id) {
    await delay();
    const u = store.users.find((x) => x.id === id);
    if (!u) throw new Error('Usuário não encontrado');
    u.status = u.status === 'bloqueado' ? 'ativo' : 'bloqueado';
    return u;
  },

  async setInfluencer(userId, montantePct = 50) {
    await delay();
    const u = store.users.find((x) => x.id === userId);
    if (!u) throw new Error('Usuário não encontrado');
    u.is_influencer = true;
    u.is_demo = true;
    u.easy_mode = true;
    u.montante_pct = montantePct;
    const code = u.referral_code || (u.name.split(' ')[0] + randCode()).toUpperCase().slice(0, 8);
    u.referral_code = code;
    u.instagram = u.instagram || `@${u.name.split(' ')[0].toLowerCase()}`;

    let inf = store.influencers.find((i) => i.user_id === userId);
    if (!inf) {
      inf = {
        id: nextId('influencer'),
        user_id: userId,
        name: u.name,
        instagram: u.instagram,
        code,
        link: `https://flappycopa.com/?ref=${code}`,
        montante_pct: montantePct,
        montante_value: store.settings.influencer_montante_initial || 0,
        montante_balance: 0,
        referrals: 0,
        depositors: 0,
        status: 'ativo',
        campaign: newCampaign(),
        history: [],
      };
      inf.campaign.montante_pct = montantePct;
      store.influencers.push(inf);
    } else {
      inf.montante_pct = montantePct;
      inf.campaign.montante_pct = montantePct;
      inf.status = 'ativo';
    }
    return { user: u, influencer: inf };
  },

  async deactivateInfluencer(userId) {
    await delay();
    const u = store.users.find((x) => x.id === userId);
    if (!u) throw new Error('Usuário não encontrado');
    u.is_influencer = false;
    u.montante_pct = undefined;
    const inf = store.influencers.find((i) => i.user_id === userId);
    if (inf) inf.status = 'inativo';
    return u;
  },

  async getUserHistory(userId) {
    await delay();
    return {
      deposits: store.userHistory.deposits(userId),
      withdrawals: store.userHistory.withdrawals(userId),
      matches: store.userHistory.matches(userId),
      gifts: store.userHistory.gifts(userId),
      coupons: store.userHistory.coupons(userId),
      referrals: store.userHistory.referrals(userId),
    };
  },

  async getDeposits(filters = {}) {
    await delay();
    return filterTransactions(store.deposits, filters);
  },

  async getWithdrawals(filters = {}) {
    await delay();
    return filterTransactions(store.withdrawals, filters);
  },

  async approveWithdrawal(id) {
    await delay();
    const w = store.withdrawals.find((x) => x.id === id);
    if (!w) throw new Error('Saque não encontrado');
    w.status = 'aprovado';
    return w;
  },

  async rejectWithdrawal(id) {
    await delay();
    const w = store.withdrawals.find((x) => x.id === id);
    if (!w) throw new Error('Saque não encontrado');
    w.status = 'recusado';
    return w;
  },

  async getGateways() {
    await delay();
    return [...store.gateways];
  },

  async saveGateway(data) {
    await delay();
    if (data.id) {
      const g = store.gateways.find((x) => x.id === data.id);
      if (g) Object.assign(g, data);
      return g;
    }
    const g = { id: nextId('gateway'), ...data };
    store.gateways.push(g);
    return g;
  },

  async deleteGateway(id) {
    await delay();
    const idx = store.gateways.findIndex((g) => g.id === id);
    if (idx !== -1) store.gateways.splice(idx, 1);
  },

  async getGifts() {
    await delay();
    syncGiftsToPlayer(store);
    return [...store.gifts];
  },

  async getGiftSettings() {
    await delay();
    return { ...store.gift_settings };
  },

  async saveGiftSettings(data) {
    await delay();
    Object.assign(store.gift_settings, data);
    setGiftSettings({ gifts_enabled: store.gift_settings.gifts_enabled !== false });
    syncGiftsToPlayer(store);
    return store.gift_settings;
  },

  async saveGift(data) {
    await delay();
    const payload = normalizeGift(data);

    if (payload.coupon_id) {
      const coupon = store.coupons.find((c) => c.id === payload.coupon_id);
      payload.coupon_name = coupon?.name || payload.coupon_name;
    }

    if (payload.is_default_new_user) {
      store.gifts.forEach((g) => { g.is_default_new_user = false; });
    }

    if (data.id) {
      const g = store.gifts.find((x) => x.id === data.id);
      if (g) Object.assign(g, payload);
      syncGiftsToPlayer(store);
      return g;
    }

    const g = { id: nextId('gift'), ...payload };
    store.gifts.push(g);
    syncGiftsToPlayer(store);
    return g;
  },

  async toggleGift(id, status) {
    await delay();
    const g = store.gifts.find((x) => x.id === id);
    if (!g) throw new Error('Presente não encontrado');
    g.status = status === 'ativo' ? 'ativo' : 'inativo';
    syncGiftsToPlayer(store);
    return g;
  },

  async deleteGift(id) {
    await delay();
    const idx = store.gifts.findIndex((g) => g.id === id);
    if (idx !== -1) store.gifts.splice(idx, 1);
    store.user_gifts = (store.user_gifts || []).filter((ug) => ug.gift_id !== id);
    syncGiftsToPlayer(store);
  },

  async sendGiftToAll(giftId) {
    await delay(300);
    const result = assignGiftToAllUsers(store, giftId);
    return result;
  },

  async getCoupons() {
    await delay();
    return [...store.coupons];
  },

  async saveCoupon(data) {
    await delay();
    const payload = { ...data, name: String(data.name || '').trim().toUpperCase() };
    if (data.id) {
      const c = store.coupons.find((x) => x.id === data.id);
      if (c) Object.assign(c, payload);
      return c;
    }
    const c = { id: nextId('coupon'), used_qty: 0, ...payload };
    store.coupons.push(c);
    return c;
  },

  async deleteCoupon(id) {
    await delay();
    const idx = store.coupons.findIndex((c) => c.id === id);
    if (idx !== -1) store.coupons.splice(idx, 1);
  },

  async getInfluencers() {
    await delay();
    return [...store.influencers];
  },

  async getInfluencer(id) {
    await delay();
    return store.influencers.find((i) => i.id === id) || null;
  },

  async updateInfluencer(id, data) {
    await delay();
    const inf = store.influencers.find((i) => i.id === id);
    if (!inf) throw new Error('Influenciador não encontrado');
    Object.assign(inf, data);
    if (data.montante_pct != null) inf.campaign.montante_pct = data.montante_pct;
    return inf;
  },

  async endPartnership(id) {
    await delay();
    const inf = store.influencers.find((i) => i.id === id);
    if (!inf) throw new Error('Influenciador não encontrado');
    const c = inf.campaign;
    inf.history.unshift({
      id: nextId('campaign'),
      start_date: c.start_date,
      end_date: new Date().toISOString(),
      referrals: c.referrals,
      depositors: c.depositors,
      volume: c.volume,
      montante_pct: c.montante_pct,
      montante_value: c.montante_value,
    });
    inf.campaign = newCampaign();
    inf.campaign.montante_pct = inf.montante_pct;
    inf.referrals = 0;
    inf.depositors = 0;
    inf.montante_value = 0;
    return inf;
  },

  async resetCampaign(id) {
    await delay();
    const inf = store.influencers.find((i) => i.id === id);
    if (!inf) throw new Error('Influenciador não encontrado');
    inf.campaign = newCampaign();
    inf.campaign.montante_pct = inf.montante_pct;
    inf.referrals = 0;
    inf.depositors = 0;
    inf.montante_value = 0;
    return inf;
  },

  async getSettings() {
    await delay();
    return { ...store.settings };
  },

  async saveSettings(data) {
    await delay();
    Object.assign(store.settings, data);
    return store.settings;
  },

  async exportReport(type, format) {
    await delay(400);
    return { type, format, filename: `relatorio-${type}-${Date.now()}.${format}`, rows: rand(50, 200) };
  },

  montanteOptions: MONTANTE_PCTS,
};

syncGiftsToPlayer(store);

function filterTransactions(items, { range, min, max, status } = {}) {
  return items.filter((it) => {
    if (range && !inRange(it.created_at, range)) return false;
    if (min && it.amount < Number(min)) return false;
    if (max && it.amount > Number(max)) return false;
    if (status && status !== 'todos' && it.status !== status) return false;
    return true;
  });
}

function randCode() {
  return Math.random().toString(36).slice(2, 6);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
