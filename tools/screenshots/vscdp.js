// Minimal CDP driver for a running VS Code (Electron) started with --remote-debugging-port=9333.
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connect(port = 9333) {
  const list = await (await fetch(`http://localhost:${port}/json`)).json();
  const t = list.find((x) => x.type === 'page' && /workbench/.test(x.url));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const KEYS = { Enter: 13, Escape: 27, ArrowDown: 40, ArrowUp: 38, Tab: 9, F1: 112, Backspace: 8 };
  const api = {
    send, sleep,
    async shot(file, clip) {
      const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result && r.result.result && r.result.result.value; },
    async key(name, mods = 0) { // mods: 1 alt, 2 ctrl, 4 meta, 8 shift
      const code = KEYS[name] || name.toUpperCase().charCodeAt(0);
      const p = { key: name.length === 1 ? name : name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, modifiers: mods, code: name.length === 1 ? 'Key' + name.toUpperCase() : name };
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...p });
      if (name.length === 1 && !(mods & 2)) await send('Input.dispatchKeyEvent', { type: 'char', text: name, ...p });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...p });
    },
    async type(text) { for (const ch of text) { await send('Input.insertText', { text: ch }); await sleep(15); } },
    async click(x, y, button = 'left') {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1 });
    },
    async where(text, sel = '*') { // center of the first visible element whose text matches
      return api.eval(`(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT);let n;while(n=w.nextNode()){if(!n.matches('${sel}'))continue;const t=(n.innerText||'').trim();if(t==='${text}'||n.getAttribute('aria-label')==='${text}'){const r=n.getBoundingClientRect();if(r.width>0&&r.height>0)return {x:r.x+r.width/2,y:r.y+r.height/2}}}return null})()`);
    },
    async palette(cmd) { await api.key('P', 2 | 8); await sleep(500); await api.type(cmd); await sleep(700); },
    async quickOpen(name) { await api.key('P', 2); await sleep(500); await api.type(name); await sleep(700); await api.key('Enter'); await sleep(1500); },
    close() { ws.close(); },
  };
  return api;
}
module.exports = { connect, sleep };
