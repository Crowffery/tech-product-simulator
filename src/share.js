/**
 * 分享卡（720×1280 竖版）：发布会卡 / 三年结局卡
 * 用 Canvas 绘制，像素风；配套一段可复制的文案。
 */

const W = 720;
const H = 1280;
const FONT_D = '"ZCOOL KuaiLe","Noto Sans SC",sans-serif';
const FONT_B = '"Noto Sans SC","PingFang SC",sans-serif';

function shade(hex, k) {
  const n = parseInt((hex || '#5aa9d6').slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function loadImg(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function frame(g, color) {
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, shade(color, -0.55));
  grd.addColorStop(0.55, '#16112a');
  grd.addColorStop(1, '#07060c');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // 像素星点
  for (let i = 0; i < 140; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 12345.678) % 1;
    g.fillStyle = i % 7 ? 'rgba(255,255,255,.35)' : 'rgba(255,224,138,.8)';
    const sz = i % 9 ? 3 : 6;
    g.fillRect(Math.abs(x) * W, Math.abs(y) * H, sz, sz);
  }
  // 厚边框（开罗风）
  g.fillStyle = '#3b2a1e';
  g.fillRect(0, 0, W, 16);
  g.fillRect(0, H - 16, W, 16);
  g.fillRect(0, 0, 16, H);
  g.fillRect(W - 16, 0, 16, H);
  g.fillStyle = '#f3e6c8';
  g.fillRect(16, 16, W - 32, 6);
  g.fillRect(16, H - 22, W - 32, 6);
  g.fillRect(16, 16, 6, H - 32);
  g.fillRect(W - 22, 16, 6, H - 32);
}

function pill(g, x, y, w, h, bg, fg, text, size = 30) {
  g.fillStyle = '#000';
  g.fillRect(x + 5, y + 5, w, h);
  g.fillStyle = bg;
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#3b2a1e';
  g.lineWidth = 5;
  g.strokeRect(x, y, w, h);
  g.fillStyle = fg;
  g.font = `900 ${size}px ${FONT_B}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x + w / 2, y + h / 2 + 2);
}

function header(g, sub) {
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffe8b0';
  g.font = `900 34px ${FONT_D}`;
  g.fillText('电子产品发展国', 52, 84);
  g.fillStyle = 'rgba(255,232,176,.7)';
  g.font = `700 24px ${FONT_B}`;
  g.fillText(sub, 52, 120);
}

function footer(g, text) {
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,232,176,.85)';
  g.font = `700 24px ${FONT_B}`;
  g.fillText(text, W / 2, H - 52);
}

const GRADE_C = { S: ['#f9e79f', '#b9770e'], A: ['#abebc6', '#1d8348'], B: ['#aed6f1', '#1f618d'], C: ['#e5e7e9', '#566573'] };

/** 发布会卡 */
export async function launchCard(state, shot) {
  await document.fonts?.ready;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const d = state.design || {};
  const Wr = state.wowResult || {};
  frame(g, d.color);
  header(g, `${state.companyName} · 第 ${state.generation} 代发布会`);

  // 聚光灯
  const sp = g.createRadialGradient(W / 2, 470, 20, W / 2, 470, 330);
  sp.addColorStop(0, 'rgba(255,240,200,.55)');
  sp.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = sp;
  g.fillRect(0, 150, W, 640);
  const img = await loadImg(shot);
  if (img) {
    const scale = Math.min(560 / img.width, 600 / img.height);
    const iw = Math.round(img.width * scale);
    const ih = Math.round(img.height * scale);
    g.drawImage(img, (W - iw) / 2, 160, iw, ih);
  }
  // 评级章
  const [gb, gf] = GRADE_C[Wr.grade] || GRADE_C.C;
  g.save();
  g.translate(590, 230);
  g.rotate(-0.18);
  g.fillStyle = '#000';
  g.fillRect(-58, -58, 124, 124);
  g.fillStyle = gb;
  g.fillRect(-64, -64, 124, 124);
  g.strokeStyle = '#3b2a1e';
  g.lineWidth = 8;
  g.strokeRect(-64, -64, 124, 124);
  g.fillStyle = gf;
  g.font = `900 96px ${FONT_B}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(Wr.grade || '-', -2, 4);
  g.restore();

  // 机型名
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = `900 92px ${FONT_D}`;
  g.fillStyle = '#e67e22';
  g.fillText(d.modelName || '新机', W / 2 + 5, 845);
  g.fillStyle = '#fffaf0';
  g.fillText(d.modelName || '新机', W / 2, 840);

  // 数据
  const stats = [
    ['惊艳', Wr.score ?? '-'],
    ['新颖', Wr.novelty ?? '-'],
    ['完成', `${Wr.completeness ?? '-'}%`],
    ['出圈', Wr.buzz ?? 0],
  ];
  stats.forEach(([k, v], i) => {
    const x = 52 + i * 158;
    g.fillStyle = '#000';
    g.fillRect(x + 5, 885, 144, 104);
    g.fillStyle = '#fff6df';
    g.fillRect(x, 880, 144, 104);
    g.strokeStyle = '#3b2a1e';
    g.lineWidth = 5;
    g.strokeRect(x, 880, 144, 104);
    g.fillStyle = '#6d5c4d';
    g.font = `700 24px ${FONT_B}`;
    g.fillText(k, x + 72, 914);
    g.fillStyle = '#2b2118';
    g.font = `900 46px ${FONT_B}`;
    g.fillText(String(v), x + 72, 966);
  });

  // 头条
  g.fillStyle = '#2b2118';
  g.fillRect(52, 1010, W - 104, 70);
  g.fillStyle = '#ffe8b0';
  g.font = `900 30px ${FONT_B}`;
  g.fillText(state.headline || '', W / 2, 1056, W - 130);

  // 首发 / 热搜
  let y = 1102;
  const tags = [...(Wr.firsts || []).map((f) => `🏆 首发 ${f}`)];
  if ((Wr.buzz || 0) >= 40) tags.push(`🔥 #${d.modelName}# 冲上热搜`);
  let x = 52;
  g.font = `900 26px ${FONT_B}`;
  for (const t of tags.slice(0, 4)) {
    const tw = g.measureText(t).width + 30;
    if (x + tw > W - 52) {
      x = 52;
      y += 56;
    }
    pill(g, x, y, tw, 44, t.startsWith('🔥') ? '#fadbd8' : '#f9e79f', '#2b2118', t, 24);
    x += tw + 12;
  }
  footer(g, `媒体 ${state.mediaScore} · 用户 ${state.userScore} · 来做一台你的梦想机`);
  return c.toDataURL('image/png');
}

/** 三年结局卡 */
export async function endingCard(state, E) {
  await document.fonts?.ready;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const last = state.models[state.models.length - 1];
  frame(g, last?.design?.color || '#e67e22');
  header(g, `${state.companyName} · 三年结算`);
  const main = E.titles[0];
  g.textAlign = 'center';
  g.fillStyle = '#f5b041';
  g.fillRect(52, 160, W - 104, 170);
  g.strokeStyle = '#3b2a1e';
  g.lineWidth = 8;
  g.strokeRect(52, 160, W - 104, 170);
  g.fillStyle = '#2b2118';
  g.font = `900 30px ${FONT_B}`;
  g.fillText('称号', W / 2, 206);
  g.font = `900 86px ${FONT_D}`;
  g.fillText(main.t, W / 2, 296);
  g.fillStyle = '#ffe8b0';
  g.font = `700 28px ${FONT_B}`;
  g.fillText(main.d, W / 2, 380);
  E.titles.slice(1, 4).forEach((t, i) => pill(g, 52 + i * 210, 410, 196, 56, '#fff6df', '#2b2118', t.t, 28));
  // 统计
  [['代产品', E.stats.gens], ['项首创', E.stats.firsts], ['平均惊艳', E.stats.avgWow], ['万台总销量', E.stats.sold]].forEach(([k, v], i) => {
    const x = 52 + i * 158;
    g.fillStyle = '#fff6df';
    g.fillRect(x, 500, 144, 110);
    g.strokeStyle = '#3b2a1e';
    g.lineWidth = 5;
    g.strokeRect(x, 500, 144, 110);
    g.fillStyle = '#2b2118';
    g.font = `900 48px ${FONT_B}`;
    g.fillText(String(v), x + 72, 562);
    g.fillStyle = '#6d5c4d';
    g.font = `700 22px ${FONT_B}`;
    g.fillText(k, x + 72, 594);
  });
  // 机型墙
  g.fillStyle = '#2c2633';
  g.fillRect(52, 640, W - 104, 520);
  g.strokeStyle = '#3b2a1e';
  g.lineWidth = 6;
  g.strokeRect(52, 640, W - 104, 520);
  const ms = state.models.slice(-8);
  const imgs = await Promise.all(ms.map((m) => loadImg(m.thumb)));
  ms.forEach((m, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 72 + col * 150;
    const y = 660 + row * 250;
    g.fillStyle = '#f9e79f';
    g.fillRect(x, y, 136, 200);
    if (imgs[i]) g.drawImage(imgs[i], x + 4, y + 4, 128, 192);
    g.fillStyle = '#ffe8b0';
    g.font = `900 22px ${FONT_B}`;
    g.fillText(`${m.design.modelName} ${m.grade || ''}`.slice(0, 10), x + 68, y + 230);
  });
  footer(g, '来《电子产品发展国》，做一台你的梦想机');
  return c.toDataURL('image/png');
}

export function launchText(state) {
  const d = state.design || {};
  const Wr = state.wowResult || {};
  const firsts = (Wr.firsts || []).length ? `首发「${Wr.firsts.join('」「')}」，` : '';
  return `我在《电子产品发展国》发布了「${d.modelName}」：${firsts}惊艳度 ${Wr.score}（${Wr.grade} 级），媒体 ${state.mediaScore} 分。${state.headline}`;
}

export function endingText(state, E) {
  return `三年做了 ${E.stats.gens} 代手机，首创 ${E.stats.firsts} 项，拿到称号「${E.titles.map((t) => t.t).join('」「')}」。来《电子产品发展国》做一台你的梦想机！`;
}

/** 弹出分享卡 */
export function showShare(dataUrl, text) {
  const ov = document.createElement('div');
  ov.className = 'share-ov';
  ov.innerHTML = `<div class="share-box kbox">
      <img src="${dataUrl}" alt="分享卡" />
      <p class="share-tip">手机上长按图片即可保存</p>
      <div class="share-btns">
        <button type="button" data-s="copy">📋 复制文案</button>
        <a class="share-dl" href="${dataUrl}" download="电子产品发展国.png">💾 保存图片</a>
        <button type="button" data-s="native" hidden>📤 分享</button>
        <button type="button" data-s="close">关闭</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const nativeBtn = ov.querySelector('[data-s="native"]');
  let file = null;
  fetch(dataUrl)
    .then((r) => r.blob())
    .then((b) => {
      file = new File([b], '电子产品发展国.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) nativeBtn.hidden = false;
    })
    .catch(() => {});
  ov.addEventListener('click', async (e) => {
    const k = e.target.closest('[data-s]')?.dataset.s;
    if (e.target === ov || k === 'close') ov.remove();
    else if (k === 'copy') {
      try {
        await navigator.clipboard.writeText(text);
        e.target.textContent = '✅ 已复制';
      } catch {
        // 剪贴板不可用：给出可手动复制的文本框
        let ta = ov.querySelector('textarea');
        if (!ta) {
          ta = document.createElement('textarea');
          ta.readOnly = true;
          ta.value = text;
          ov.querySelector('.share-box').appendChild(ta);
        }
        ta.select();
      }
    } else if (k === 'native' && file) {
      navigator.share({ files: [file], text }).catch(() => {});
    }
  });
}
