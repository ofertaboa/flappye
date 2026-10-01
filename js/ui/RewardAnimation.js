import { GAME_CONFIG } from '../config.js';

import { formatMoney } from '../utils.js';

import { getDeviceProfile } from '../deviceProfile.js';



export class RewardAnimation {

  constructor() {

    const device = getDeviceProfile();

    this.items = [];

    this.maxItems = device.lowEnd ? 1 : device.mobile ? 2 : 4;

    this.enabled = !device.lowEnd;

    this._labelCache = new Map();

  }



  labelFor(amount) {

    const key = String(amount);

    if (!this._labelCache.has(key)) {

      this._labelCache.set(key, `+${formatMoney(amount)}`);

    }

    return this._labelCache.get(key);

  }



  spawn(x, y, amount) {

    if (!this.enabled) return;



    if (this.items.length >= this.maxItems) {

      this.items.shift();

    }



    this.items.push({

      x,

      y,

      text: this.labelFor(amount),

      life: 0,

      maxLife: GAME_CONFIG.rewardAnimationDuration,

    });

  }



  update(deltaMs) {

    let write = 0;

    for (let i = 0; i < this.items.length; i += 1) {

      const item = this.items[i];

      item.life += deltaMs;

      if (item.life < item.maxLife) {

        this.items[write] = item;

        write += 1;

      }

    }

    this.items.length = write;

  }



  draw(ctx) {

    if (!this.items.length) return;



    ctx.save();

    ctx.fillStyle = '#4ade80';

    ctx.font = 'bold 18px system-ui, sans-serif';

    ctx.textAlign = 'center';



    for (let i = 0; i < this.items.length; i += 1) {

      const item = this.items[i];

      const t = item.life / item.maxLife;

      ctx.globalAlpha = 1 - t;

      ctx.fillText(item.text, item.x, item.y - t * 36);

    }



    ctx.restore();

  }

}

