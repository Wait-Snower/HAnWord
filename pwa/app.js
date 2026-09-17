const APP_VERSION = '2.3.0';
const MODES = {
  device: 'device',
  app: 'app',
  site: 'site',
  purpose: 'purpose',
};

const PBKDF2_ITERATIONS = 210000;

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SPECIAL_CHARS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const ALL_CHARS = UPPERCASE + LOWERCASE + DIGITS + SPECIAL_CHARS;

const hasDocument = typeof document !== 'undefined';
const hasWindow = typeof window !== 'undefined';
const hasNavigator = typeof navigator !== 'undefined';
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

const form = hasDocument ? document.querySelector('#password-form') : null;
const output = hasDocument ? document.querySelector('#password-output') : null;
const resultCard = hasDocument ? document.querySelector('#result-card') : null;
const analysisNode = hasDocument ? document.querySelector('#analysis') : null;
const versionPill = hasDocument ? document.querySelector('#version-pill') : null;
const updateCard = hasDocument ? document.querySelector('#update-card') : null;
const refreshBtn = hasDocument ? document.querySelector('#refresh-btn') : null;
const clearCacheBtn = hasDocument ? document.querySelector('#clear-cache-btn') : null;

let waitingWorker = null;

const normalizeText = (text) => text.normalize('NFKC').trim();
const containsHanzi = (text) => /[一-鿿]/u.test(text);

if (versionPill) {
  versionPill.textContent = `版本 ${APP_VERSION}`;
}

function normalizeContext(mode, context) {
  const normalizedMode = normalizeText(mode).toLowerCase();
  const normalizedContext = normalizeText(context);
  if (!normalizedMode && !normalizedContext) return '';
  if (!normalizedMode) return `purpose:${normalizedContext}`;
  if (!MODES[normalizedMode]) throw new Error('mode 必须是 device、app、site、purpose 之一');
  if (!normalizedContext) throw new Error('提供模式时必须同时提供非空上下文');
  return `${MODES[normalizedMode]}:${normalizedContext}`;
}

async function deriveBytes(hanziText, normalizedContext, size) {
  if (!globalThis.crypto?.subtle || !textEncoder) {
    throw new Error('当前环境不支持 Web Crypto，无法生成稳定密码');
  }

  const passwordBytes = textEncoder.encode(normalizeText(hanziText));
  const saltBytes = textEncoder.encode(`HAnWordPWA::${normalizedContext}`);
  const key = await globalThis.crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    size * 8,
  );

  return new Uint8Array(derivedBits);
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
  const derived = await deriveBytes(normalizedHanzi, normalizedContext, Math.max(length * 4, 64));
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
  if (!analysisNode) return;
  analysisNode.innerHTML = Object.entries(stats)
    .map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`)
    .join('');
}

function showUpdateCard(worker) {
  if (!updateCard) return;
  waitingWorker = worker;
  updateCard.hidden = false;
}

function hideUpdateCard() {
  waitingWorker = null;
  if (!updateCard) return;
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

if (form && output && resultCard && refreshBtn && clearCacheBtn && hasWindow && hasNavigator) {
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

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      const registration = await navigator.serviceWorker.register(`./sw.js?v=${APP_VERSION}`);
      watchRegistration(registration);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  }
}

globalThis.HAnWordPWA = {
  APP_VERSION,
  generatePassword,
  normalizeContext,
  normalizeText,
};
