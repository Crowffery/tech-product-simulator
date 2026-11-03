/**
 * 按键时代产品短片 —— 与现代短片同一套排版、光效与缓动（由 films.js 注入工具函数）。
 * 每一段讲清楚「这台按键机的一个卖点」，内容全部由玩家配置驱动：
 *   kp_material  机身与键盘的微距：塑料耐摔 / 钢琴烤漆镜面 / 金属拉丝
 *   kp_screen    单色绿屏（省电、看得清）或彩屏一格格点亮（6.5 万色 / 26 万色）
 *   kp_ringtone  单音 → 16 和弦 → 64 和弦：声部一层层叠上去
 *   kp_standby   日历一页页翻，电量格一格格少；隔壁那台先关机
 *   kp_drop      砸核桃 + 1.5 米跌落慢动作
 *   kp_bigtext   同一条短信，小字 / 大字对比
 *   kp_sos       按住 SOS → 儿子的手机响了
 *   kp_camera    马赛克慢慢变清楚，快门一闪
 *   kp_dualsim   两张卡插进去，两排信号满格
 *   kp_t9        九宫格 / 全键盘打出一条短信
 *   kp_network   GSM → GPRS → EDGE → 3G：一张 WAP 页面加载出来
 *   kp_music     MP3 / 收音机：耳机线 + 均衡器
 *   kp_flip      侧面看翻盖打开，「啪」
 *   kp_torch     黑暗里一束光
 */
export function makeKeypadFilms(h) {
  const { type, vignette, glow, rr, ease, easeIO, seg, clamp, rand, rgba, mix, FONT } = h;
  const LCD = { bg: '#9bbc0f', fg: '#0f380f', mid: '#306230', light: '#8bac0f' };

  function bgGrad(g, W, H, a, b) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }

  /** 画一台按键机正面（矢量）：机身 + 屏幕 + 方向键 + 3×4 键盘 */
  function phone(g, x, y, w, h, color, o = {}) {
    const r = w * 0.16;
    // 机身
    const body = g.createLinearGradient(x, y, x + w, y + h);
    body.addColorStop(0, mix(color, 0.25));
    body.addColorStop(0.5, color);
    body.addColorStop(1, mix(color, -0.35));
    g.fillStyle = body;
    rr(g, x, y, w, h, r);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)';
    g.lineWidth = Math.max(1, w * 0.012);
    g.stroke();
    // 高光边
    g.strokeStyle = 'rgba(255,255,255,.22)';
    rr(g, x + w * 0.02, y + w * 0.02, w * 0.96, h - w * 0.04, r * 0.9);
    g.stroke();
    // 听筒
    g.fillStyle = 'rgba(0,0,0,.55)';
    rr(g, x + w * 0.36, y + h * 0.035, w * 0.28, h * 0.018, h * 0.009);
    g.fill();
    // 屏幕
    const sx = x + w * 0.13;
    const sy = y + h * 0.08;
    const sw = w * 0.74;
    const sh = h * (o.elder ? 0.3 : 0.34);
    g.fillStyle = '#111';
    rr(g, sx - w * 0.03, sy - w * 0.03, sw + w * 0.06, sh + w * 0.06, w * 0.04);
    g.fill();
    if (o.drawScreen) o.drawScreen(g, sx, sy, sw, sh);
    else {
      g.fillStyle = o.screenColor || LCD.bg;
      g.fillRect(sx, sy, sw, sh);
    }
    // 方向键 + 通话 / 挂断
    const ky = sy + sh + h * 0.05;
    const cx = x + w / 2;
    g.fillStyle = mix(color, -0.5);
    g.beginPath();
    g.ellipse(cx, ky + h * 0.04, w * 0.17, h * 0.04, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = mix(color, 0.35);
    g.beginPath();
    g.arc(cx, ky + h * 0.04, w * 0.06, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#27ae60';
    rr(g, x + w * 0.08, ky + h * 0.02, w * 0.16, h * 0.04, h * 0.012);
    g.fill();
    g.fillStyle = '#c0392b';
    rr(g, x + w * 0.76, ky + h * 0.02, w * 0.16, h * 0.04, h * 0.012);
    g.fill();
    // 数字键
    const rows = 4;
    const cols = 3;
    const top = ky + h * 0.11;
    const kh = (y + h * 0.95 - top) / rows;
    const kw = (w * 0.84) / cols;
    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    for (let i = 0; i < 12; i++) {
      const kx = x + w * 0.08 + (i % cols) * kw;
      const kyy = top + Math.floor(i / cols) * kh;
      const lit = o.litKey === i;
      const kg = g.createLinearGradient(kx, kyy, kx, kyy + kh);
      kg.addColorStop(0, lit ? '#fff4c2' : mix(color, 0.45));
      kg.addColorStop(1, lit ? '#f5b041' : mix(color, 0.05));
      g.fillStyle = kg;
      rr(g, kx + kw * 0.07, kyy + kh * 0.1, kw * 0.86, kh * 0.78, kh * 0.25);
      g.fill();
      if (o.backlight) {
        g.fillStyle = rgba(o.backlight, 0.25);
        rr(g, kx + kw * 0.07, kyy + kh * 0.1, kw * 0.86, kh * 0.78, kh * 0.25);
        g.fill();
      }
      g.fillStyle = lit ? '#3a2a00' : 'rgba(0,0,0,.7)';
      g.font = `800 ${Math.round(kh * (o.elder ? 0.6 : 0.42))}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(labels[i], kx + kw / 2, kyy + kh * 0.5);
    }
    g.textBaseline = 'alphabetic';
    if (o.sos) {
      g.fillStyle = '#e74c3c';
      rr(g, x - w * 0.05, y + h * 0.42, w * 0.07, h * 0.12, w * 0.03);
      g.fill();
    }
  }

  /** LCD 像素点阵文字（用小字号画在格子里，再放大） */
  function lcdText(g, x, y, w, h, lines, opts = {}) {
    g.fillStyle = opts.bg || LCD.bg;
    g.fillRect(x, y, w, h);
    // 像素网格
    g.strokeStyle = rgba('#000000', 0.06);
    g.lineWidth = 1;
    const cell = Math.max(2, Math.round(w / 64));
    for (let i = x; i < x + w; i += cell) {
      g.beginPath();
      g.moveTo(i, y);
      g.lineTo(i, y + h);
      g.stroke();
    }
    g.fillStyle = opts.fg || LCD.fg;
    g.textAlign = 'center';
    lines.forEach((ln, i) => {
      g.font = `900 ${Math.round(ln.size * h)}px ${FONT}`;
      g.fillText(ln.t, x + w / 2, y + h * ln.y);
    });
  }

  const film = {
    /** 机身微距：键帽倒角上的高光划过 */
    kp_material(g, W, H, t, d) {
      const s = Math.min(W, H);
      const color = d.design?.color || d.color || '#3a3d46';
      const mat = d.design?.parts?.material ?? 0;
      bgGrad(g, W, H, '#0b0c10', '#1b1d24');
      const k = easeIO(seg(t, 0, 3.2));
      const scale = 1.9 - k * 0.75;
      const pw = s * 0.42 * scale;
      const ph = pw * 2.25;
      const px = W / 2 - pw / 2 + (1 - k) * pw * 0.25;
      const py = H * 0.52 - ph * 0.42 + (1 - k) * ph * 0.18;
      glow(g, W / 2, H * 0.55, s * 0.6, color, 0.25);
      phone(g, px, py, pw, ph, color, {
        elder: d.design?.formFactor === 'elder',
        sos: d.design?.formFactor === 'elder',
        drawScreen: (gg, x, y, w, hh) =>
          (d.design?.parts?.screen ?? 0) === 0
            ? lcdText(gg, x, y, w, hh, [{ t: '华夏通信', size: 0.12, y: 0.25 }, { t: '09:30', size: 0.34, y: 0.68 }])
            : lcdText(gg, x, y, w, hh, [{ t: '华夏通信', size: 0.12, y: 0.25 }, { t: '09:30', size: 0.34, y: 0.68 }], { bg: '#bfe0ff', fg: '#0d2a52' }),
      });
      // 掠光
      const sweep = ((t * 0.55) % 1.4) - 0.2;
      g.save();
      rr(g, px, py, pw, ph, pw * 0.16);
      g.clip();
      const sg = g.createLinearGradient(px + pw * sweep - pw * 0.3, py, px + pw * sweep + pw * 0.3, py + ph);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, `rgba(255,255,255,${mat === 1 ? 0.45 : mat === 2 ? 0.3 : 0.16})`);
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg;
      g.fillRect(px, py, pw, ph);
      if (mat === 2) {
        // 拉丝纹理
        g.strokeStyle = 'rgba(255,255,255,.05)';
        for (let i = 0; i < 80; i++) {
          const yy = py + (i / 80) * ph;
          g.beginPath();
          g.moveTo(px, yy);
          g.lineTo(px + pw, yy + rand(i) * 2);
          g.stroke();
        }
      }
      g.restore();
      vignette(g, W, H, 0.7);
      const T = [
        { kicker: '工程塑料机身', title: '摔不坏的底气', sub: '一体注塑 · 按键手感清脆' },
        { kicker: '钢琴烤漆', title: '亮得能照镜子', sub: '七层喷涂 · 手工打磨' },
        { kicker: '金属拉丝', title: '拿出来，就是体面', sub: '铝合金面板 · 发丝纹理' },
      ][mat] || { kicker: '机身', title: d.design?.modelName || '新机', sub: '' };
      type(g, W, H, t, { ...T, y: 0.1, at: 0.4 });
    },

    /** 屏幕：单色省电 / 彩屏一格格点亮 */
    kp_screen(g, W, H, t, d) {
      const s = Math.min(W, H);
      const tier = d.design?.parts?.screen ?? 0;
      bgGrad(g, W, H, '#06080a', '#11161c');
      const sw = s * 0.72;
      const sh = sw * (tier === 2 ? 1.25 : 1.0);
      const x0 = W / 2 - sw / 2;
      const y0 = H * 0.5 - sh * 0.38;
      g.fillStyle = '#000';
      rr(g, x0 - s * 0.03, y0 - s * 0.03, sw + s * 0.06, sh + s * 0.06, s * 0.03);
      g.fill();
      if (tier === 0) {
        lcdText(g, x0, y0, sw, sh, [
          { t: '华夏通信', size: 0.09, y: 0.2 },
          { t: `${String(9 + Math.floor(t)).padStart(2, '0')}:${String(Math.floor(t * 12) % 60).padStart(2, '0')}`, size: 0.3, y: 0.58 },
          { t: '菜单        名片夹', size: 0.075, y: 0.92 },
        ]);
        // 背光一闪
        const b = Math.max(0, Math.sin(t * 2.2)) * 0.2;
        g.fillStyle = `rgba(200,255,120,${b})`;
        g.fillRect(x0, y0, sw, sh);
        type(g, W, H, t, { kicker: '单色屏', title: '太阳底下看得清', sub: '不费电：一块电池用一周', y: 0.06, at: 0.3 });
      } else {
        const cells = tier === 2 ? 18 : 14;
        const cw = sw / cells;
        const ch = sh / cells;
        const R = easeIO(seg(t, 0.4, 2.6)) * Math.hypot(sw, sh) * 0.62;
        const hue0 = t * 40;
        for (let yy = 0; yy < cells; yy++)
          for (let xx = 0; xx < cells; xx++) {
            const cx = x0 + (xx + 0.5) * cw;
            const cy = y0 + (yy + 0.5) * ch;
            const dd = Math.hypot(cx - W / 2, cy - (y0 + sh / 2));
            if (dd < R) {
              const hue = (hue0 + (xx / cells) * 280 + (yy / cells) * 60) % 360;
              const light = tier === 2 ? 55 : 50;
              g.fillStyle = `hsl(${Math.round(hue / (tier === 2 ? 1 : 22)) * (tier === 2 ? 1 : 22)},${tier === 2 ? 80 : 65}%,${light}%)`;
            } else g.fillStyle = (xx + yy) % 2 ? LCD.bg : LCD.light;
            g.fillRect(x0 + xx * cw, y0 + yy * ch, cw + 0.5, ch + 0.5);
            // 波前高光
            if (Math.abs(dd - R) < cw) {
              g.fillStyle = 'rgba(255,255,255,.5)';
              g.fillRect(x0 + xx * cw, y0 + yy * ch, cw, ch);
            }
          }
        type(g, W, H, t, {
          kicker: tier === 2 ? '2.4 英寸大彩屏' : '1.8 英寸彩屏',
          title: tier === 2 ? '26 万色' : '6.5 万色',
          sub: tier === 2 ? '彩信里的照片，和冲洗出来的一样' : '彩信、彩色铃声图标，一眼就分得清',
          y: 0.06,
          at: 1.6,
          grad: ['#f5b041', '#e74c3c'],
        });
      }
      vignette(g, W, H, 0.55);
    },

    /** 铃声：声部一层层叠上来 */
    kp_ringtone(g, W, H, t, d) {
      const s = Math.min(W, H);
      const tier = d.design?.parts?.ringtone ?? 0;
      bgGrad(g, W, H, '#140b22', '#2a1440');
      const layers = tier === 0 ? 1 : tier === 1 ? 4 : 8;
      const shown = Math.min(layers, 1 + Math.floor(seg(t, 0.3, 2.6) * layers));
      const cols = ['#ffb0e0', '#f5b041', '#5dade2', '#82e0aa', '#bb8fce', '#f1948a', '#f9e79f', '#aed6f1'];
      for (let L = 0; L < shown; L++) {
        g.strokeStyle = rgba(cols[L % cols.length], 0.85 - L * 0.06);
        g.lineWidth = Math.max(2, s * 0.008);
        g.beginPath();
        const amp = s * (0.05 + L * 0.012);
        const freq = 2 + L * 0.9;
        for (let x = 0; x <= W; x += 3) {
          const ph = (x / W) * Math.PI * 2 * freq - t * (3 + L);
          const v = tier === 0 ? Math.sign(Math.sin(ph)) : Math.sin(ph) * Math.cos(ph * 0.5 + L);
          const y = H * 0.55 + v * amp;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      // 飞出的音符
      for (let i = 0; i < 10; i++) {
        const q = (t * 0.45 + rand(i)) % 1;
        g.globalAlpha = 1 - q;
        g.fillStyle = cols[i % cols.length];
        g.font = `900 ${Math.round(s * (0.05 + rand(i + 9) * 0.04))}px ${FONT}`;
        g.textAlign = 'center';
        g.fillText(i % 2 ? '♪' : '♫', W * (0.15 + rand(i + 3) * 0.7), H * (0.8 - q * 0.5));
      }
      g.globalAlpha = 1;
      vignette(g, W, H, 0.5);
      type(g, W, H, t, {
        kicker: tier === 0 ? '铃声' : '和弦铃声',
        title: tier === 0 ? '响亮的单音' : tier === 1 ? '16 和弦' : '64 和弦',
        sub: tier === 0 ? '嘈杂的菜市场里也听得见' : tier === 1 ? '十六个声部，一首完整的歌' : '六十四个声部，外放像一支乐队',
        y: 0.08,
        at: 0.3,
        align: 'center',
        grad: ['#ffb0e0', '#f5b041'],
      });
    },

    /** 待机：日历翻页，电量格一格格少 */
    kp_standby(g, W, H, t, d) {
      const s = Math.min(W, H);
      const days = d.days || d.phys?.standbyDays || 7;
      bgGrad(g, W, H, '#07121c', '#102a3c');
      const k = seg(t, 0.4, 3.2);
      const day = Math.max(1, Math.round(1 + k * (days - 1)));
      // 日历
      const cx = W * 0.32;
      const cy = H * 0.52;
      const cw = s * 0.36;
      const chh = s * 0.42;
      g.fillStyle = '#ecf0f1';
      rr(g, cx - cw / 2, cy - chh / 2, cw, chh, s * 0.02);
      g.fill();
      g.fillStyle = '#c0392b';
      rr(g, cx - cw / 2, cy - chh / 2, cw, chh * 0.24, s * 0.02);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `800 ${Math.round(s * 0.04)}px ${FONT}`;
      g.textAlign = 'center';
      g.fillText('待机第', cx, cy - chh / 2 + chh * 0.16);
      const flip = (k * (days - 1)) % 1;
      g.save();
      g.translate(cx, cy + chh * 0.12);
      g.scale(1, 1 - Math.min(0.9, flip < 0.2 ? flip * 4 : 0));
      g.fillStyle = '#2c3e50';
      g.font = `900 ${Math.round(s * 0.17)}px ${FONT}`;
      g.fillText(String(day), 0, s * 0.06);
      g.restore();
      g.fillStyle = '#7f8c8d';
      g.font = `700 ${Math.round(s * 0.032)}px ${FONT}`;
      g.fillText('天', cx, cy + chh / 2 - chh * 0.07);
      // 电量：我们 vs 隔壁
      const bars = (x, label, life) => {
        const left = Math.max(0, 1 - (day - 1) / life);
        g.fillStyle = '#bdc3c7';
        g.font = `700 ${Math.round(s * 0.032)}px ${FONT}`;
        g.fillText(label, x, H * 0.3);
        g.strokeStyle = '#ecf0f1';
        g.lineWidth = 3;
        g.strokeRect(x - s * 0.08, H * 0.34, s * 0.16, s * 0.3);
        g.fillStyle = '#ecf0f1';
        g.fillRect(x - s * 0.03, H * 0.34 - s * 0.02, s * 0.06, s * 0.02);
        const n = Math.ceil(left * 3);
        for (let i = 0; i < 3; i++) {
          g.fillStyle = i < n ? (n === 1 ? '#e74c3c' : '#2ecc71') : 'rgba(255,255,255,.08)';
          g.fillRect(x - s * 0.065, H * 0.34 + s * 0.3 - (i + 1) * s * 0.095, s * 0.13, s * 0.08);
        }
        if (left <= 0) {
          g.fillStyle = '#e74c3c';
          g.font = `900 ${Math.round(s * 0.04)}px ${FONT}`;
          g.fillText('已关机', x, H * 0.34 + s * 0.38);
        }
      };
      bars(W * 0.64, '本机', days + 1);
      bars(W * 0.84, '同价位', Math.max(3, Math.round(days * 0.45)));
      vignette(g, W, H, 0.5);
      type(g, W, H, t, { kicker: '待机时间', title: `${days} 天`, sub: '出一趟差，充电器可以不带', y: 0.06, at: 0.2, grad: ['#7ec8ff', '#2ecc71'] });
    },

    /** 砸核桃 + 跌落 */
    kp_drop(g, W, H, t, d) {
      const s = Math.min(W, H);
      const color = d.design?.color || '#3a3d46';
      bgGrad(g, W, H, '#1a120a', '#2e2214');
      const floor = H * 0.8;
      g.fillStyle = '#3e2c1a';
      g.fillRect(0, floor, W, H - floor);
      const pw = s * 0.16;
      const ph = pw * 2.25;
      const nx = W * 0.7;
      if (t < 1.8) {
        // 第一幕：砸核桃
        const k = seg(t, 0.2, 0.9);
        const hit = t > 0.9;
        const py = floor - ph - s * 0.06 + (hit ? 0 : -s * 0.25 * (1 - easeIO(k)));
        g.save();
        g.translate(nx, py + ph / 2);
        g.rotate(-Math.PI / 2 + (hit ? 0 : 0.3 * (1 - k)));
        phone(g, -pw / 2, -ph / 2, pw, ph, color);
        g.restore();
        // 核桃
        const wr = s * 0.05;
        if (!hit) {
          g.fillStyle = '#a0712f';
          g.beginPath();
          g.arc(nx, floor - wr, wr, 0, Math.PI * 2);
          g.fill();
        } else {
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI - Math.PI;
            const q = seg(t, 0.9, 1.6);
            g.fillStyle = i % 2 ? '#8b5a2b' : '#c49a5a';
            g.beginPath();
            g.arc(nx + Math.cos(a) * q * s * 0.2, floor - wr * 0.5 + Math.sin(a) * q * s * 0.08, wr * 0.35, 0, Math.PI * 2);
            g.fill();
          }
          glow(g, nx, floor - wr, s * 0.2, '#f5b041', 0.4 * (1 - seg(t, 0.9, 1.4)));
        }
        type(g, W, H, t, { kicker: '耐用测试 1', title: '砸核桃', sub: '核桃碎了，手机还亮着', y: 0.06, at: 0.1 });
      } else {
        // 第二幕：1.5 米跌落慢动作
        const tt = t - 1.8;
        const fall = Math.min(1, tt / 1.1);
        const bounce = tt > 1.1 ? Math.abs(Math.sin((tt - 1.1) * 7)) * Math.exp(-(tt - 1.1) * 3) : 0;
        const py = H * 0.12 + (floor - ph - H * 0.12) * (fall * fall) - bounce * s * 0.12;
        g.save();
        g.translate(W * 0.42, py + ph / 2);
        g.rotate(fall * 0.6 + bounce * 0.4);
        phone(g, -pw / 2, -ph / 2, pw, ph, color);
        g.restore();
        // 刻度尺
        g.strokeStyle = 'rgba(255,255,255,.35)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(W * 0.18, H * 0.12);
        g.lineTo(W * 0.18, floor);
        g.stroke();
        g.fillStyle = '#ecf0f1';
        g.font = `800 ${Math.round(s * 0.035)}px ${FONT}`;
        g.textAlign = 'left';
        g.fillText('1.5 m', W * 0.2, H * 0.15);
        if (tt > 1.1) {
          for (let i = 0; i < 12; i++) {
            const q = seg(tt, 1.1, 1.8);
            g.fillStyle = `rgba(200,170,120,${0.5 * (1 - q)})`;
            g.beginPath();
            g.arc(W * 0.42 + (rand(i) - 0.5) * q * s * 0.5, floor - rand(i + 4) * q * s * 0.1, s * 0.012, 0, Math.PI * 2);
            g.fill();
          }
        }
        type(g, W, H, tt, { kicker: '耐用测试 2', title: '1.5 米跌落', sub: tt > 1.4 ? '捡起来，开机——照常' : '慢动作回放', y: 0.06, at: 0 });
      }
      vignette(g, W, H, 0.55);
    },

    /** 大字：同一条短信的两种字号 */
    kp_bigtext(g, W, H, t, d) {
      const s = Math.min(W, H);
      bgGrad(g, W, H, '#0d140d', '#1c2a1c');
      const k = easeIO(seg(t, 0.5, 1.8));
      const msg = '妈，周末回家吃饭';
      const box = (x, size, label) => {
        g.fillStyle = LCD.bg;
        rr(g, x - s * 0.2, H * 0.32, s * 0.4, s * 0.48, s * 0.02);
        g.fill();
        g.fillStyle = LCD.fg;
        g.textAlign = 'left';
        g.font = `900 ${Math.round(size)}px ${FONT}`;
        const per = Math.max(1, Math.floor((s * 0.36) / size));
        for (let i = 0; i * per < msg.length; i++) g.fillText(msg.slice(i * per, (i + 1) * per), x - s * 0.18, H * 0.32 + s * 0.06 + size * 1.2 * (i + 0.8));
        g.fillStyle = '#bdc3c7';
        g.textAlign = 'center';
        g.font = `700 ${Math.round(s * 0.032)}px ${FONT}`;
        g.fillText(label, x, H * 0.32 + s * 0.56);
      };
      box(W * 0.27, s * 0.03, '普通字号');
      box(W * 0.73, s * (0.03 + 0.05 * k), '大字模式');
      vignette(g, W, H, 0.5);
      type(g, W, H, t, { kicker: '大字 · 大声', title: '不戴老花镜也看得清', sub: '字号放大三倍，听筒音量加大一倍', y: 0.06, at: 0.2 });
    },

    /** SOS：按住 → 儿子的手机响了 */
    kp_sos(g, W, H, t, d) {
      const s = Math.min(W, H);
      bgGrad(g, W, H, '#1a0707', '#3a0f12');
      const press = seg(t, 0.4, 0.8);
      const bx = W * 0.3;
      const by = H * 0.55;
      for (let i = 0; i < 3; i++) {
        const q = ((t - 0.8) * 0.8 + i / 3) % 1;
        if (t < 0.8) break;
        g.strokeStyle = `rgba(231,76,60,${1 - q})`;
        g.lineWidth = 4;
        g.beginPath();
        g.arc(bx, by, s * 0.08 + q * s * 0.35, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = press > 0 ? '#e74c3c' : '#c0392b';
      g.beginPath();
      g.arc(bx, by, s * (0.08 - press * 0.01), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `900 ${Math.round(s * 0.05)}px ${FONT}`;
      g.textAlign = 'center';
      g.fillText('SOS', bx, by + s * 0.018);
      // 另一台手机响
      if (t > 1.4) {
        const sh = Math.sin(t * 40) * s * 0.006;
        phone(g, W * 0.62 + sh, H * 0.3, s * 0.2, s * 0.45, '#2c3e50', {
          drawScreen: (gg, x, y, w, h) =>
            lcdText(gg, x, y, w, h, [
              { t: '来电', size: 0.16, y: 0.35 },
              { t: '妈', size: 0.32, y: 0.78 },
            ]),
        });
        g.fillStyle = '#f5b041';
        g.font = `800 ${Math.round(s * 0.032)}px ${FONT}`;
        g.fillText('儿子的手机', W * 0.72, H * 0.27);
      }
      vignette(g, W, H, 0.55);
      type(g, W, H, t, { kicker: '一键求助', title: '按住三秒，打给家人', sub: '同时发出一条带位置的短信', y: 0.06, at: 0.2, grad: ['#ff8a80', '#f5b041'] });
    },

    /** 拍照：马赛克 → 清楚 */
    kp_camera(g, W, H, t, d) {
      const s = Math.min(W, H);
      const tier = d.design?.parts?.camera ?? 1;
      bgGrad(g, W, H, '#05070a', '#0e1520');
      const fx = W / 2 - s * 0.34;
      const fy = H * 0.3;
      const fw = s * 0.68;
      const fh = s * 0.52;
      const k = easeIO(seg(t, 0.4, 2.4));
      const block = Math.max(tier === 2 ? 3 : 6, Math.round(28 - k * 24));
      // 程序画面：一个人站在树下
      const px = (u, v) => {
        const sky = [120 + v * 60, 170 + v * 40, 230];
        const dxh = u - 0.5;
        const head = Math.hypot(dxh, v - 0.38) < 0.09;
        const body = Math.abs(dxh) < 0.12 && v > 0.46 && v < 0.95;
        const tree = Math.hypot(u - 0.2, v - 0.3) < 0.16 || (Math.abs(u - 0.2) < 0.03 && v > 0.4);
        if (head) return [240, 200, 160];
        if (body) return [200, 60, 60];
        if (tree) return u > 0.18 && v > 0.4 ? [110, 70, 40] : [60, 140, 70];
        if (v > 0.85) return [90, 160, 80];
        return sky;
      };
      for (let y = 0; y < fh; y += block)
        for (let x = 0; x < fw; x += block) {
          const c = px((x + block / 2) / fw, (y + block / 2) / fh);
          g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
          g.fillRect(fx + x, fy + y, block, block);
        }
      // 取景框
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      const L = s * 0.05;
      [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]].forEach(([x, y, a, b]) => {
        g.beginPath();
        g.moveTo(x + a * L, y);
        g.lineTo(x, y);
        g.lineTo(x, y + b * L);
        g.stroke();
      });
      if (t > 2.4 && t < 2.7) {
        g.fillStyle = `rgba(255,255,255,${1 - seg(t, 2.4, 2.7)})`;
        g.fillRect(0, 0, W, H);
      }
      vignette(g, W, H, 0.5);
      type(g, W, H, t, {
        kicker: '内置摄像头',
        title: tier === 2 ? '130 万像素' : '30 万像素',
        sub: tier === 2 ? '拍下来，用彩信发给家里' : '能拍，能存，能当屏保',
        y: 0.06,
        at: 0.2,
      });
    },

    /** 双卡：两张卡、两排信号 */
    kp_dualsim(g, W, H, t, d) {
      const s = Math.min(W, H);
      bgGrad(g, W, H, '#08101a', '#142538');
      [0, 1].forEach((i) => {
        const k = ease(seg(t, 0.3 + i * 0.5, 1.0 + i * 0.5));
        const x = W * (0.32 + i * 0.36);
        const y = H * 0.36 + (1 - k) * s * 0.3;
        g.fillStyle = i ? '#f5b041' : '#5dade2';
        g.beginPath();
        g.moveTo(x - s * 0.1, y);
        g.lineTo(x + s * 0.06, y);
        g.lineTo(x + s * 0.1, y + s * 0.04);
        g.lineTo(x + s * 0.1, y + s * 0.2);
        g.lineTo(x - s * 0.1, y + s * 0.2);
        g.closePath();
        g.fill();
        g.fillStyle = '#d4ac0d';
        g.fillRect(x - s * 0.05, y + s * 0.06, s * 0.08, s * 0.08);
        for (let b = 0; b < 5; b++) {
          const on = t > 1.4 + i * 0.3 + b * 0.12;
          g.fillStyle = on ? '#2ecc71' : 'rgba(255,255,255,.12)';
          g.fillRect(x - s * 0.1 + b * s * 0.045, H * 0.72 - b * s * 0.025, s * 0.032, s * 0.04 + b * s * 0.025);
        }
        g.fillStyle = '#ecf0f1';
        g.font = `800 ${Math.round(s * 0.035)}px ${FONT}`;
        g.textAlign = 'center';
        g.fillText(i ? '卡 2 · 家里' : '卡 1 · 工作', x, H * 0.82);
      });
      vignette(g, W, H, 0.5);
      type(g, W, H, t, { kicker: '双卡双待', title: '一台手机，两个号码', sub: '工作和生活，再也不用揣两部', y: 0.06, at: 0.2 });
    },

    /** 键盘打短信 */
    kp_t9(g, W, H, t, d) {
      const s = Math.min(W, H);
      const qwerty = (d.design?.parts?.keyboard ?? 0) === 2;
      bgGrad(g, W, H, '#0a0f0a', '#16221a');
      const msg = qwerty ? '会议改到明早九点，请各位准时。' : '下班了，回家吃饭。';
      const n = Math.min(msg.length, Math.floor(seg(t, 0.4, 3.0) * (msg.length + 1)));
      lcdText(g, W / 2 - s * 0.35, H * 0.24, s * 0.7, s * 0.28, [
        { t: '写短信', size: 0.13, y: 0.2 },
        { t: msg.slice(0, Math.min(n, 9)), size: 0.15, y: 0.55 },
        { t: msg.slice(9, n), size: 0.15, y: 0.82 },
      ]);
      const cols = qwerty ? 10 : 3;
      const rows = qwerty ? 3 : 4;
      const kw = (s * 0.8) / cols;
      const kh = kw * (qwerty ? 0.8 : 0.55);
      const lit = Math.floor(t * 6) % (cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        const x = W / 2 - s * 0.4 + (i % cols) * kw;
        const y = H * 0.62 + Math.floor(i / cols) * kh * 1.15;
        g.fillStyle = i === lit ? '#f5b041' : '#2c3e50';
        rr(g, x + 2, y, kw - 4, kh, kh * 0.25);
        g.fill();
        g.fillStyle = i === lit ? '#2c1a00' : '#bdc3c7';
        g.font = `800 ${Math.round(kh * 0.42)}px ${FONT}`;
        g.textAlign = 'center';
        g.fillText(qwerty ? 'QWERTYUIOPASDFGHJKL;ZXCVBNM,.?'[i] : '123456789*0#'[i], x + kw / 2, y + kh * 0.65);
      }
      vignette(g, W, H, 0.5);
      type(g, W, H, t, {
        kicker: qwerty ? '全键盘' : '九宫格输入',
        title: qwerty ? '像在电脑上打字' : '拇指一按，字就出来',
        sub: qwerty ? '每个字母都有自己的键' : '联想输入，常用词一键出',
        y: 0.06,
        at: 0.2,
      });
    },

    /** 制式：WAP 页面加载 */
    kp_network(g, W, H, t, d) {
      const s = Math.min(W, H);
      const lv = d.design?.parts?.network ?? 0;
      const names = ['GSM', 'GPRS', 'EDGE', '3G'];
      bgGrad(g, W, H, '#060a14', '#0f1a30');
      names.forEach((nm, i) => {
        const on = i <= lv && t > 0.4 + i * 0.4;
        const x = W * (0.16 + i * 0.23);
        g.fillStyle = on ? (i === lv ? '#f5b041' : '#5dade2') : 'rgba(255,255,255,.1)';
        rr(g, x - s * 0.09, H * 0.3, s * 0.18, s * 0.1, s * 0.02);
        g.fill();
        g.fillStyle = on ? '#0b1220' : 'rgba(255,255,255,.35)';
        g.font = `900 ${Math.round(s * 0.045)}px ${FONT}`;
        g.textAlign = 'center';
        g.fillText(nm, x, H * 0.3 + s * 0.068);
      });
      const speed = [0.15, 0.4, 0.7, 1][lv];
      const k = clamp(seg(t, 1.6, 3.4) * speed * 1.6);
      lcdText(g, W / 2 - s * 0.32, H * 0.48, s * 0.64, s * 0.36, [
        { t: lv === 0 ? '短信 · 通话' : '华夏移动梦网', size: 0.1, y: 0.18 },
        { t: lv === 0 ? '信号满格' : k >= 1 ? '新闻 · 天气 · 铃声下载' : '正在连接……', size: 0.09, y: 0.5 },
      ]);
      if (lv > 0) {
        g.fillStyle = LCD.fg;
        g.fillRect(W / 2 - s * 0.28, H * 0.48 + s * 0.27, s * 0.56 * k, s * 0.03);
        g.strokeStyle = LCD.fg;
        g.strokeRect(W / 2 - s * 0.28, H * 0.48 + s * 0.27, s * 0.56, s * 0.03);
      }
      vignette(g, W, H, 0.5);
      type(g, W, H, t, {
        kicker: '网络制式',
        title: lv === 0 ? 'GSM 信号满格' : lv === 3 ? '3G：能视频通话' : `${names[lv]} 手机上网`,
        sub: ['打电话、发短信，哪里都通', '看新闻、查天气，按流量计费', '彩信秒发，网页更快', '对着屏幕，就能看见对方'][lv],
        y: 0.06,
        at: 0.2,
      });
    },

    /** MP3 / 收音机 */
    kp_music(g, W, H, t, d) {
      const s = Math.min(W, H);
      const mp3 = (d.design?.concepts || []).includes('mp3') || (d.design?.parts?.ringtone ?? 0) === 2;
      bgGrad(g, W, H, '#100818', '#26123a');
      for (let i = 0; i < 16; i++) {
        const hgt = (0.2 + Math.abs(Math.sin(t * 4 + i * 0.7)) * 0.8) * s * 0.35;
        const x = W / 2 - s * 0.4 + i * s * 0.05;
        const gr = g.createLinearGradient(0, H * 0.75 - hgt, 0, H * 0.75);
        gr.addColorStop(0, '#f5b041');
        gr.addColorStop(1, '#8e44ad');
        g.fillStyle = gr;
        g.fillRect(x, H * 0.75 - hgt, s * 0.035, hgt);
      }
      // 耳机线
      g.strokeStyle = '#ecf0f1';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(W * 0.1, H * 0.85);
      g.bezierCurveTo(W * 0.3, H * 0.95 + Math.sin(t * 2) * 10, W * 0.7, H * 0.8, W * 0.9, H * 0.9);
      g.stroke();
      vignette(g, W, H, 0.5);
      type(g, W, H, t, {
        kicker: mp3 ? 'MP3 播放' : 'FM 收音机',
        title: mp3 ? '把一百首歌装进口袋' : '插上耳机就能听广播',
        sub: mp3 ? '随身听，可以退休了' : '耳机线就是天线',
        y: 0.06,
        at: 0.2,
        grad: ['#f5b041', '#bb8fce'],
      });
    },

    /** 翻盖：正面看，上半身从合上翻到打开，内屏亮起 */
    kp_flip(g, W, H, t, d) {
      const s = Math.min(W, H);
      const color = d.design?.color || '#3a3d46';
      bgGrad(g, W, H, '#0b0b12', '#1d1d2c');
      const k = easeIO(seg(t, 0.7, 1.35));
      const pw = s * 0.36;
      const half = pw * 1.15;
      const cx = W / 2;
      const hinge = H * 0.5;
      glow(g, cx, hinge, s * 0.5, color, 0.18 + 0.2 * k);
      // 下半身（键盘）
      phone(g, cx - pw / 2, hinge - half * 0.02, pw, half * 2.05, color, {});
      g.save();
      g.beginPath();
      g.rect(0, hinge, W, H);
      g.clip();
      g.restore();
      // 遮掉下半身的屏幕区域，只留键盘
      g.fillStyle = mix(color, -0.1);
      rr(g, cx - pw / 2, hinge - half * 0.02, pw, half * 0.62, pw * 0.12);
      g.fill();
      // 上半身：用纵向压缩模拟翻开（k=0 合上盖住键盘，k=1 竖起）
      const upH = half * (0.08 + 0.92 * k);
      const upY = hinge - upH;
      const flipY = k < 0.5 ? hinge : upY;
      const flipH = k < 0.5 ? half * (1 - k * 2) : upH;
      if (k < 0.5) {
        // 外壳朝上：外屏 + 机身
        const body = g.createLinearGradient(0, flipY, 0, flipY + flipH);
        body.addColorStop(0, mix(color, 0.3));
        body.addColorStop(1, mix(color, -0.3));
        g.fillStyle = body;
        rr(g, cx - pw / 2, flipY, pw, Math.max(4, flipH), pw * 0.14);
        g.fill();
        g.fillStyle = '#111';
        rr(g, cx - pw * 0.2, flipY + flipH * 0.25, pw * 0.4, Math.max(2, flipH * 0.25), pw * 0.04);
        g.fill();
      } else {
        // 内侧朝向我们：主屏亮起
        g.fillStyle = mix(color, 0.1);
        rr(g, cx - pw / 2, upY, pw, upH, pw * 0.14);
        g.fill();
        lcdText(g, cx - pw * 0.38, upY + upH * 0.14, pw * 0.76, upH * 0.66, [
          { t: '来电', size: 0.16, y: 0.32 },
          { t: '妈', size: 0.34, y: 0.78 },
        ], { bg: (d.design?.parts?.screen ?? 0) ? '#cfe8ff' : undefined, fg: (d.design?.parts?.screen ?? 0) ? '#12305a' : undefined });
      }
      // 转轴
      g.fillStyle = mix(color, -0.45);
      rr(g, cx - pw * 0.42, hinge - pw * 0.05, pw * 0.84, pw * 0.1, pw * 0.05);
      g.fill();
      if (t > 1.3 && t < 2.0) {
        const q = seg(t, 1.3, 2.0);
        g.globalAlpha = 1 - q;
        g.fillStyle = '#fff';
        g.font = `900 ${Math.round(s * (0.1 + q * 0.04))}px ${FONT}`;
        g.textAlign = 'center';
        g.fillText('啪', cx + pw * 0.9, hinge - half * 0.6);
        g.globalAlpha = 1;
      }
      vignette(g, W, H, 0.55);
      type(g, W, H, t, { kicker: '翻盖', title: '一开，一合', sub: '翻开就是接听，合上就是挂断', y: 0.06, at: 0.2 });
    },

    /** 手电筒：黑暗的楼道里一束光 */
    kp_torch(g, W, H, t, d) {
      const s = Math.min(W, H);
      g.fillStyle = '#030305';
      g.fillRect(0, 0, W, H);
      const on = seg(t, 0.6, 0.8);
      // 楼梯台阶（被光照到才看得见）
      const lx = W / 2;
      const ly = H * 0.26;
      if (on > 0) {
        g.save();
        g.beginPath();
        g.moveTo(lx - s * 0.02, ly);
        g.lineTo(lx - s * 0.55, H);
        g.lineTo(lx + s * 0.55, H);
        g.lineTo(lx + s * 0.02, ly);
        g.closePath();
        g.clip();
        const beam = g.createLinearGradient(0, ly, 0, H);
        beam.addColorStop(0, `rgba(255,250,215,${0.85 * on})`);
        beam.addColorStop(1, `rgba(255,250,215,${0.18 * on})`);
        g.fillStyle = beam;
        g.fillRect(0, ly, W, H - ly);
        for (let i = 0; i < 6; i++) {
          const y = H * 0.55 + i * s * 0.08;
          g.fillStyle = `rgba(80,70,55,${0.55 * on})`;
          g.fillRect(0, y, W, s * 0.012);
        }
        g.restore();
        // 灰尘
        for (let i = 0; i < 30; i++) {
          const q = (t * 0.1 + rand(i)) % 1;
          g.fillStyle = `rgba(255,255,230,${0.5 * on * (1 - q)})`;
          g.fillRect(lx + (rand(i + 7) - 0.5) * s * 0.6 * (0.3 + q), ly + q * (H - ly), 2, 2);
        }
      }
      // 手机顶部
      g.fillStyle = mix(d.design?.color || '#3a3d46', -0.2);
      rr(g, lx - s * 0.1, ly - s * 0.08, s * 0.2, s * 0.08, s * 0.03);
      g.fill();
      g.fillStyle = on > 0 ? '#fffbe6' : '#444';
      g.beginPath();
      g.arc(lx, ly - s * 0.01, s * 0.018, 0, Math.PI * 2);
      g.fill();
      if (on > 0) glow(g, lx, ly, s * 0.12, '#fffbe6', 0.8 * on);
      type(g, W, H, t, { kicker: '手电筒', title: '停电的晚上，它在', sub: '顶部一颗 LED，长按就亮', y: 0.06, at: 0.9 });
    },
  };
  // 兼容旧名
  film.kp_colorbloom = film.kp_screen;
  return film;
}
