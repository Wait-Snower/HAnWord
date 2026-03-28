const APP_VERSION = '2.2.3';
const MODES = {
  device: 'device',
  app: 'app',
  site: 'site',
  purpose: 'purpose',
};

const PBKDF2_ITERATIONS = 210000;
const PBKDF2_HASH = 'SHA256';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL_CHARS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL_CHARS;

const form = document.querySelector('#password-form');
const output = document.querySelector('#password-output');
const resultCard = document.querySelector('#result-card');
const analysisNode = document.querySelector('#analysis');
const copyBtn = document.querySelector('#copy-btn');
const versionPill = document.querySelector('#version-pill');
const installState = document.querySelector('#install-state');
const installCard = document.querySelector('#install-card');
const installBtn = document.querySelector('#install-btn');
const dismissInstallBtn = document.querySelector('#dismiss-install-btn');
const installCopy = document.querySelector('#install-copy');
const updateCard = document.querySelector('#update-card');
const refreshBtn = document.querySelector('#refresh-btn');
const clearCacheBtn = document.querySelector('#clear-cache-btn');

let deferredInstallPrompt = null;
let waitingWorker = null;

const normalizeText = (text) => text.normalize('NFKC').trim();
const containsHanzi = (text) => /[一-鿿]/u.test(text);

versionPill.textContent = `版本 ${APP_VERSION}`;
installState.textContent = window.matchMedia('(display-mode: standalone)').matches ? '已作为应用运行' : '浏览器内打开';

function normalizeContext(mode, context) {
  const normalizedMode = normalizeText(mode).toLowerCase();
  const normalizedContext = normalizeText(context);
  if (!normalizedMode && !normalizedContext) return '';
  if (!normalizedMode) return `purpose:${normalizedContext}`;
  if (!MODES[normalizedMode]) throw new Error('mode 必须是 device、app、site、purpose 之一');
  if (!normalizedContext) throw new Error('提供模式时必须同时提供非空上下文');
  return `${MODES[normalizedMode]}:${normalizedContext}`;
}

function deriveBytes(hanziText, normalizedContext, size) {
  const password = normalizeText(hanziText);
  const salt = `HAnWordPWA::${normalizedContext}`;
  
  const hmacSHA256 = (key, data) => {
    const BLOCK_SIZE = 64;
    const keyBytes = key instanceof Uint8Array ? key : (typeof key === 'string' ? strToBytes(key) : new Uint8Array(key));
    const dataBytes = data instanceof Uint8Array ? data : (typeof data === 'string' ? strToBytes(data) : new Uint8Array(data));
    
    if (keyBytes.length > BLOCK_SIZE) {
      keyBytes = sha256(keyBytes);
    }
    
    const ipad = new Uint8Array(BLOCK_SIZE);
    const opad = new Uint8Array(BLOCK_SIZE);
    for (let i = 0; i < BLOCK_SIZE; i++) {
      const kb = i < keyBytes.length ? keyBytes[i] : 0;
      ipad[i] = kb ^ 0x36;
      opad[i] = kb ^ 0x5c;
    }
    
    const innerHash = sha256(concatBytes(ipad, dataBytes));
    return sha256(concatBytes(opad, innerHash));
  };
  
  const sha256 = (data) => {
    const bytes = typeof data === 'string' ? strToBytes(data) : data;
    const hash = [];
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    
    const k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    
    const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const bitLen = bytes.length * 8;
    padded[padded.length - 4] = (bitLen >>> 24) & 0xff;
    padded[padded.length - 3] = (bitLen >>> 16) & 0xff;
    padded[padded.length - 2] = (bitLen >>> 8) & 0xff;
    padded[padded.length - 1] = bitLen & 0xff;
    
    for (let chunk = 0; chunk < padded.length; chunk += 64) {
      const w = new Uint32Array(64);
      for (let i = 0; i < 16; i++) {
        w[i] = (padded[chunk + i * 4] << 24) | (padded[chunk + i * 4 + 1] << 16) |
               (padded[chunk + i * 4 + 2] << 8) | padded[chunk + i * 4 + 3];
      }
      for (let i = 16; i < 64; i++) {
        const s0 = (w[i-15] >>> 7) | (w[i-15] << 25) ^ (w[i-15] >>> 18) | (w[i-15] << 14) ^ (w[i-15] >>> 3);
        const s1 = (w[i-2] >>> 17) | (w[i-2] << 15) ^ (w[i-2] >>> 19) | (w[i-2] << 13) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
      }
      
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, hh = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = (e >>> 6) | (e << 26) ^ (e >>> 11) | (e << 21) ^ (e >>> 25) | (e << 7);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (hh + S1 + ch + k[i] + w[i]) >>> 0;
        const S0 = (a >>> 2) | (a << 30) ^ (a >>> 13) | (a << 19) ^ (a >>> 22) | (a << 10);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        hh = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + hh) >>> 0;
    }
    
    return new Uint8Array([
      (h0 >>> 24) & 0xff, (h0 >>> 16) & 0xff, (h0 >>> 8) & 0xff, h0 & 0xff,
      (h1 >>> 24) & 0xff, (h1 >>> 16) & 0xff, (h1 >>> 8) & 0xff, h1 & 0xff,
      (h2 >>> 24) & 0xff, (h2 >>> 16) & 0xff, (h2 >>> 8) & 0xff, h2 & 0xff,
      (h3 >>> 24) & 0xff, (h3 >>> 16) & 0xff, (h3 >>> 8) & 0xff, h3 & 0xff,
      (h4 >>> 24) & 0xff, (h4 >>> 16) & 0xff, (h4 >>> 8) & 0xff, h4 & 0xff,
      (h5 >>> 24) & 0xff, (h5 >>> 16) & 0xff, (h5 >>> 8) & 0xff, h5 & 0xff,
      (h6 >>> 24) & 0xff, (h6 >>> 16) & 0xff, (h6 >>> 8) & 0xff, h6 & 0xff,
      (h7 >>> 24) & 0xff, (h7 >>> 16) & 0xff, (h7 >>> 8) & 0xff, h7 & 0xff
    ]);
  };
  
  const strToBytes = (str) => {
    if (typeof str !== 'string') return new Uint8Array(0);
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      if (char < 0x80) bytes.push(char);
      else if (char < 0x800) {
        bytes.push(0xc0 | (char >> 6), 0x80 | (char & 0x3f));
      } else if (char < 0x10000) {
        bytes.push(0xe0 | (char >> 12), 0x80 | ((char >> 6) & 0x3f), 0x80 | (char & 0x3f));
      } else {
        bytes.push(0xf0 | (char >> 18), 0x80 | ((char >> 12) & 0x3f), 0x80 | ((char >> 6) & 0x3f), 0x80 | (char & 0x3f));
      }
    }
    return bytes;
  };
  
  const concatBytes = (a, b) => {
    const c = new Uint8Array(a.length + b.length);
    c.set(a); c.set(b, a.length);
    return c;
  };
  
  const passwordBytes = strToBytes(password);
  const saltBytes = strToBytes(salt);
  
  let u = hmacSHA256(passwordBytes, saltBytes);
  let result = new Uint8Array(u);
  
  for (let i = 1; i < PBKDF2_ITERATIONS; i++) {
    u = hmacSHA256(passwordBytes, u);
    for (let j = 0; j < result.length; j++) {
      result[j] ^= u[j];
    }
  }
  
  return result.slice(0, size);
}

async function generatePassword(hanziText, length = 16, context = '', mode = '') {
  const normalizedHanzi = normalizeText(hanziText);
  if (!normalizedHanzi || !containsHanzi(normalizedHanzi)) {
    throw new Error('请输入至少一个汉字');
  }
  if (!Number.isInteger(length) || length < 8) {
    throw new Error('密码长度不能小于 8 位');
  }

  const normalizedContext = normalizeContext(mode, context);
  const derived = deriveBytes(normalizedHanzi, normalizedContext, Math.max(length * 4, 64));
  const passwordList = [
    UPPERCASE[derived[0] % UPPERCASE.length],
    LOWERCASE[derived[1] % LOWERCASE.length],
    DIGITS[derived[2] % DIGITS.length],
    SPECIAL_CHARS[derived[3] % SPECIAL_CHARS.length],
  ];

  for (let i = 4; i < length; i += 1) {
    passwordList.push(ALL_CHARS[derived[i] % ALL_CHARS.length]);
  }

  for (let i = passwordList.length - 1; i > 0; i -= 1) {
    const swapIndex = derived[length + i] % (i + 1);
    [passwordList[i], passwordList[swapIndex]] = [passwordList[swapIndex], passwordList[i]];
  }

  return passwordList.join('');
}

function analyzePassword(password) {
  return {
    总长度: password.length,
    大写字母: [...password].filter((char) => UPPERCASE.includes(char)).length,
    小写字母: [...password].filter((char) => LOWERCASE.includes(char)).length,
    数字: [...password].filter((char) => DIGITS.includes(char)).length,
    特殊符号: [...password].filter((char) => SPECIAL_CHARS.includes(char)).length,
  };
}

function renderAnalysis(stats) {
  analysisNode.innerHTML = Object.entries(stats)
    .map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`)
    .join('');
}

function showInstallCard(message) {
  if (message) installCopy.textContent = message;
  installCard.hidden = false;
}

function hideInstallCard() {
  installCard.hidden = true;
}

function showUpdateCard(worker) {
  waitingWorker = worker;
  updateCard.hidden = false;
}

function hideUpdateCard() {
  waitingWorker = null;
  updateCard.hidden = true;
}

async function clearOfflineCache() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.filter((name) => name.startsWith('hanword-pwa-')).map((name) => caches.delete(name)));
}

function watchRegistration(registration) {
  if (registration.waiting) {
    showUpdateCard(registration.waiting);
  }

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateCard(worker);
      }
    });
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const hanzi = document.querySelector('#hanzi').value;
  const length = Number.parseInt(document.querySelector('#length').value, 10);
  const mode = document.querySelector('#mode').value;
  const context = document.querySelector('#context').value;

  try {
    if (context && !mode) {
      throw new Error('填写上下文时请同时选择模式');
    }
    const password = await generatePassword(hanzi, length, context, mode);
    output.textContent = password;
    renderAnalysis(analyzePassword(password));
    resultCard.hidden = false;
  } catch (error) {
    alert(error.message);
  }
});

copyBtn.addEventListener('click', async () => {
  const text = output.textContent?.trim();
  if (!text) {
    alert('请先生成密码');
    return;
  }
  await navigator.clipboard.writeText(text);
  copyBtn.textContent = '已复制';
  window.setTimeout(() => {
    copyBtn.textContent = '复制密码';
  }, 1400);
});

installBtn.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => {});
    deferredInstallPrompt = null;
    hideInstallCard();
    return;
  }
  alert('当前浏览器没有提供自动安装按钮，请使用浏览器菜单中的“添加到主屏幕”。');
});

dismissInstallBtn.addEventListener('click', () => {
  hideInstallCard();
});

refreshBtn.addEventListener('click', () => {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
});

clearCacheBtn.addEventListener('click', async () => {
  await clearOfflineCache();
  alert('已清理离线缓存，页面将重新加载。');
  window.location.reload();
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallCard('检测到可安装环境。安装后可从主屏幕直接打开，并继续离线使用。');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installState.textContent = '已安装到主屏幕';
  hideInstallCard();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`);
    watchRegistration(registration);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      showInstallCard('可将本页添加到主屏幕，像普通 App 一样打开。若浏览器没有自动安装按钮，请使用菜单中的“添加到主屏幕”。');
    }
  });
}
