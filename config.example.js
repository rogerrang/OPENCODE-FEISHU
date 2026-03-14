/**
 * ==========================================
 * Roger BRAIN - Configuration File
 * ==========================================
 *
 * SETUP INSTRUCTIONS:
 *   1. Copy this file:  cp config.example.js config.js
 *   2. Fill in all required fields below
 *   3. Never commit config.js to Git (it's in .gitignore)
 */

module.exports = {

    // ── Required ────────────────────────────────────────────────────────────

    /**
     * Your Feishu Custom Bot Webhook URL
     * Where to get it: Feishu group → Settings → Bots → Add Custom Bot → Copy Webhook URL
     * Example: "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
     */
    FEISHU_WEBHOOK: "YOUR_FEISHU_WEBHOOK_URL_HERE",

    /**
     * Absolute path to the project directory that OpenCode will work in.
     * This is the folder you want your AI agent to operate on.
     * Windows example: "C:\\Users\\YourName\\Desktop\\my-project"
     * Mac/Linux example: "/Users/yourname/projects/my-project"
     */
    WORK_DIR: "C:\\Users\\YourName\\Desktop\\your-project",

    // ── Security (Recommended) ───────────────────────────────────────────────

    /**
     * Feishu Encrypt Key  (from Feishu Open Platform → App → Event Subscriptions → Encrypt Key)
     * When set, all incoming Feishu requests will be AES-256-CBC encrypted.
     * Strongly recommended for production use.
     * Leave as empty string "" to disable encryption (plaintext mode).
     */
    FEISHU_ENCRYPT_KEY: "",

    /**
     * Feishu Verification Token  (from Feishu Open Platform → App → Event Subscriptions)
     * Currently stored for reference. Future versions may use this for Token verification.
     * Leave as empty string "" if not using.
     */
    FEISHU_VERIFICATION_TOKEN: "",

    // ── OpenCode Settings ────────────────────────────────────────────────────

    /**
     * The OpenCode model to use for processing commands.
     * Examples:
     *   "opencode/claude-3-5-sonnet"
     *   "opencode/claude-3-7-sonnet"
     *   "opencode/gpt-4o"
     *   "antigravity-manager/gemini-3-flash"   ← if using Antigravity
     */
    OPENCODE_MODEL: "opencode/claude-3-5-sonnet",

    /**
     * Port that `opencode serve` listens on (default: 55222)
     * Only change this if you explicitly ran opencode serve on a different port.
     */
    OPENCODE_PORT: 55222,

    // ── Server Settings ──────────────────────────────────────────────────────

    /**
     * Port this webhook bridge listens on (default: 3000)
     * The Cloudflare tunnel in RUN_COMMANDER.bat points to this port.
     * If you change this, also update RUN_COMMANDER.bat line:
     *   bin\cloudflared.exe tunnel --url http://localhost:3000
     */
    PORT: 3000,

    /**
     * OpenCode CLI command name (default: "opencode")
     * Change only if your opencode binary has a different name or path.
     */
    OPENCODE_CMD: "opencode",
};
