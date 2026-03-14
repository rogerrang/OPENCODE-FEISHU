/**
 * ==========================================
 * Roger BRAIN - Bi-directional Command System
 * V28.0 – FINAL STABLE (encoding, auto‑confirm, timeout)
 * ==========================================
 *
 * Configuration: Copy config.example.js → config.js and fill in your values.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load user config
const config = require('./config.js');

const app = express();
// rawBody must be captured BEFORE bodyParser parses, for signature verification
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// ============== Configuration ==============
const PORT                    = config.PORT || 3000;
const FEISHU_WEBHOOK          = config.FEISHU_WEBHOOK;
const WORK_DIR                = config.WORK_DIR;
const OPENCODE_CMD            = config.OPENCODE_CMD || 'opencode';
const OPENCODE_MODEL          = config.OPENCODE_MODEL || 'opencode/claude-3-5-sonnet';
const OPENCODE_PORT           = config.OPENCODE_PORT || 55222;
const FEISHU_ENCRYPT_KEY      = config.FEISHU_ENCRYPT_KEY || '';
const FEISHU_VERIFICATION_TOKEN = config.FEISHU_VERIFICATION_TOKEN || '';
const SESSION_LOCK_FILE       = path.join(__dirname, '.current_session_id');

// ============== Security Helpers ==============

// Decrypt AES-256-CBC payload from Feishu (used when Encrypt Key is enabled)
function decryptPayload(encryptStr, key) {
    const hash = crypto.createHash('sha256');
    hash.update(key);
    const keyBuffer = hash.digest();
    const contents = Buffer.from(encryptStr, 'base64');
    const iv = contents.slice(0, 16);
    const data = contents.slice(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(data, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

// Verify Feishu request signature (X-Lark-Signature header)
function verifyFeishuSign(timestamp, nonce, sign, rawBody) {
    const str = timestamp + nonce + FEISHU_ENCRYPT_KEY + rawBody;
    const hash = crypto.createHash('sha256');
    hash.update(str);
    const calculatedSign = hash.digest('hex');
    return calculatedSign === sign;
}

// ============== State ==============
let currentSessionId = null;

function loadSession() {
    if (fs.existsSync(SESSION_LOCK_FILE)) {
        currentSessionId = fs.readFileSync(SESSION_LOCK_FILE, 'utf8').trim();
        console.log(`[LOADED] Session: ${currentSessionId}`);
    }
}
loadSession();

// ============== Utilities ==============
function logToFile(msg) {
    const ts = new Date().toISOString();
    fs.appendFileSync(path.join(__dirname, 'server.log'), `[${ts}] ${msg}\n`);
    console.log(`[LOG] ${msg}`);
}

function cleanOutput(str) {
    if (!str) return '';
    return str
        .replace(/\x1B\[[0-9;]*[mGKHF]/g, '')
        .replace(/\x1B\[\??\d+[hl]/g, '')
        .trim();
}

async function sendToFeishu(text) {
    if (!text) return;
    axios.post(FEISHU_WEBHOOK, { msg_type: 'text', content: { text } })
        .catch(e => logToFile(`飞书发送失败: ${e.message}`));
}

// ============== Session Capture ==============
async function getMostRecentSession() {
    return new Promise(resolve => {
        const proc = spawn(`${OPENCODE_CMD} session list`, {
            cwd: WORK_DIR,
            shell: true
        });
        let out = '';
        proc.stdout.on('data', d => out += d.toString());
        proc.on('close', () => {
            const lines = out.trim().split(/\r?\n/);
            for (const line of lines) {
                const m = line.trim().match(/^(ses_[a-zA-Z0-9]+)/);
                if (m) return resolve(m[1]);
            }
            resolve(null);
        });
    });
}

// ============== Opencode Health ==============
async function checkServer() {
    try {
        await axios.get(`http://127.0.0.1:${OPENCODE_PORT}/config`, {
            timeout: 1500,
            auth: { username: '', password: '' }
        });
        return true;
    } catch (e) {
        return !!(e.response && (e.response.status === 401 || e.response.status === 200));
    }
}

// ============== Command Runner (auto‑confirm + timeout) ==============
async function runCommand(userMsg) {
    return new Promise(async (resolve, reject) => {
        const serverRunning = await checkServer();
        const isFirstRun = !currentSessionId;
        const args = ['run', '--model', OPENCODE_MODEL];

        if (!isFirstRun && serverRunning) {
            args.push('--attach', `http://127.0.0.1:${OPENCODE_PORT}`, '--session', currentSessionId);
            logToFile(`[REUSE] Session: ${currentSessionId}`);
        } else if (!isFirstRun) {
            args.push('--session', currentSessionId);
            logToFile(`[REUSE] Standalone: ${currentSessionId}`);
        } else {
            logToFile(`[NEW] Fresh session init...`);
        }
        args.push(userMsg);

        const cmdStr = `chcp 65001 > nul && echo y | "${OPENCODE_CMD}" ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`;
        logToFile(`[EXEC] ${cmdStr}`);

        const proc = spawn(cmdStr, {
            cwd: WORK_DIR,
            shell: true,
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                LANG: 'zh_CN.UTF-8'
            }
        });

        let output = '';
        const timer = setTimeout(() => {
            proc.kill();
            logToFile(`[TIMEOUT] Opencode exceeded 5 min – killed.`);
            reject(new Error('执行超时，后台任务可能仍在运行'));
        }, 300000); // 5 minutes

        proc.stdout.on('data', d => output += d.toString());
        proc.stderr.on('data', d => output += d.toString());

        proc.on('close', async (code) => {
            clearTimeout(timer);
            logToFile(`[DONE] Exit code: ${code}`);
            if (isFirstRun || !currentSessionId) {
                const newSess = await getMostRecentSession();
                if (newSess && newSess !== currentSessionId) {
                    currentSessionId = newSess;
                    fs.writeFileSync(SESSION_LOCK_FILE, newSess);
                    logToFile(`[CAPTURED] ID: ${newSess}`);
                    await sendToFeishu(`✅ 会话已绑定，后续将自动延续上下文。\nSession: ${newSess.substring(0, 10)}...`);
                }
            }
            resolve({ code, output: cleanOutput(output) });
        });

        proc.on('error', err => {
            clearTimeout(timer);
            logToFile(`[ERROR] Spawn failed: ${err.message}`);
            reject(err);
        });
    });
}

// ============== Webhook ==============
app.post('/webhook', async (req, res) => {
    try {
        const rawBody = req.rawBody ? req.rawBody.toString() : '';

        // 1. Parse JSON
        let data;
        try {
            data = JSON.parse(rawBody);
        } catch (e) {
            logToFile(`[ERROR] Failed to parse JSON: ${e.message}`);
            return res.sendStatus(400);
        }

        // 2. Signature verification (present on all requests when security is enabled)
        const timestamp = req.headers['x-lark-request-timestamp'] || '';
        const nonce     = req.headers['x-lark-request-nonce'] || '';
        const signature = req.headers['x-lark-signature'] || '';

        if (FEISHU_ENCRYPT_KEY && signature) {
            if (!verifyFeishuSign(timestamp, nonce, signature, rawBody)) {
                logToFile(`[SECURITY] 签名验证失败`);
                return res.sendStatus(401);
            }
            logToFile(`[SECURITY] 签名验证通过`);
        }

        // 3. Decrypt — when Encrypt Key is enabled, ALL requests (including url_verification)
        //    arrive as { "encrypt": "..." }. Must decrypt BEFORE checking data.type.
        if (data.encrypt) {
            if (!FEISHU_ENCRYPT_KEY) {
                logToFile(`[ERROR] 收到加密请求但未配置 FEISHU_ENCRYPT_KEY`);
                return res.sendStatus(400);
            }
            try {
                data = decryptPayload(data.encrypt, FEISHU_ENCRYPT_KEY);
                logToFile(`[SECURITY] 解密成功`);
            } catch (e) {
                logToFile(`[SECURITY] 解密失败: ${e.message}`);
                return res.sendStatus(400);
            }
        }

        // 4. URL verification challenge (must happen AFTER decrypt)
        if (data.type === 'url_verification') {
            logToFile(`[VERIFY] URL验证成功, challenge: ${data.challenge}`);
            return res.json({ challenge: data.challenge });
        }

        // 5. Handle message events
        if (data.header?.event_type === 'im.message.receive_v1') {
            const userMsg = JSON.parse(data.event.message.content).text;
            logToFile(`收到指令: ${userMsg}`);
            res.sendStatus(200);

            const status = currentSessionId ? `[会话延续]` : `[首次开启]`;
            await sendToFeishu(`Roger 指挥官\n指令: ${userMsg}\n🚀 ${status} 处理中...`);

            try {
                const { code, output } = await runCommand(userMsg);
                const statusTxt = code === 0 ? '✅ 完成' : `❌ 失败 (${code})`;
                const reply = output.length > 2000 ? `...[截断]\n${output.slice(-2000)}` : output;
                await sendToFeishu(`${statusTxt}\n\n${reply || '(执行结果为空)'}`);
            } catch (err) {
                await sendToFeishu(`❌ 错误: ${err.message}`);
            }
        } else {
            res.sendStatus(200);
        }
    } catch (err) {
        logToFile(`[ERROR] Webhook handler exception: ${err.message}`);
        return res.sendStatus(500);
    }
});

// ============== Start ==============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\nRoger BRAIN V28.0 – Listening on ${PORT}`);
    console.log(`Work Dir:        ${WORK_DIR}`);
    console.log(`OpenCode Model:  ${OPENCODE_MODEL}`);
    console.log(`Encrypt Key:     ${FEISHU_ENCRYPT_KEY ? '✅ Configured' : '⚠️  Not set (plaintext mode)'}`);
    console.log(`Current Session: ${currentSessionId || 'NONE'}\n`);
});
