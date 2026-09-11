const express = require("express");
const path = require("path");
const fs = require("fs");

// Load key=value lines from .env (dependency-free dotenv).
(function loadEnv() {
    const envPath = path.join(__dirname, ".env");

    if (!fs.existsSync(envPath)) {
        return;
    }

    fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(function (line) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.charAt(0) === "#") {
            return;
        }

        const eq = trimmed.indexOf("=");

        if (eq === -1) {
            return;
        }

        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (key && !(key in process.env)) {
            process.env[key] = value;
        }
    });
})();

const app = express();

app.use(express.json());

// Serve static files from public/ (chat.html, admin.html live here).
app.use(express.static(path.join(__dirname, "public")));

// File that records every AI chat exchange (name, message, verdict).
const CHAT_LOG_FILE = path.join(__dirname, "chat-logs.json");

function appendChatLog(entry) {
    try {
        let logs = [];

        if (fs.existsSync(CHAT_LOG_FILE)) {
            const parsed = JSON.parse(
                fs.readFileSync(CHAT_LOG_FILE, "utf8")
            );

            if (Array.isArray(parsed)) {
                logs = parsed;
            }
        }

        logs.push(entry);

        fs.writeFileSync(
            CHAT_LOG_FILE,
            JSON.stringify(logs, null, 2)
        );
    } catch (err) {
        console.error("Failed to write chat log:", err);
    }
}

// The browser never receives APP_API_KEY.  This Express server acts as a
// small Backend-for-Frontend (BFF) and forwards authenticated user requests
// to FastAPI only when SCAM_API_URL is configured.
function backendConfigured() {
    return Boolean(process.env.SCAM_API_URL);
}

function backendApiUrl(path) {
    const chatUrl = process.env.SCAM_API_URL;

    if (!chatUrl) {
        const error = new Error("Backend chưa được cấu hình (thiếu SCAM_API_URL).");
        error.status = 503;
        throw error;
    }

    try {
        return new URL(path, chatUrl).toString();
    } catch {
        const error = new Error("SCAM_API_URL không phải URL hợp lệ.");
        error.status = 503;
        throw error;
    }
}

async function backendUserRequest(path, userId, options = {}) {
    const appApiKey = process.env.APP_API_KEY;

    if (!appApiKey) {
        const error = new Error("Backend chưa được cấu hình (thiếu APP_API_KEY).");
        error.status = 503;
        throw error;
    }

    if (!userId) {
        const error = new Error("Thiếu mã người dùng.");
        error.status = 400;
        throw error;
    }

    const headers = {
        "X-API-Key": appApiKey,
        "X-User-ID": userId,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
    };
    const response = await fetch(backendApiUrl(path), {
        method: options.method || "GET",
        headers,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
    });
    const data = response.status === 204
        ? null
        : await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            typeof data?.detail === "string"
                ? data.detail
                : `Backend trả lỗi HTTP ${response.status}`
        );
        error.status = response.status;
        throw error;
    }

    return data;
}

async function backendAdminRequest(path, options = {}) {
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (!adminApiKey) {
        const error = new Error("Backend admin chưa được cấu hình (thiếu ADMIN_API_KEY).");
        error.status = 503;
        throw error;
    }

    const response = await fetch(backendApiUrl(path), {
        method: options.method || "GET",
        headers: {
            "X-Admin-Key": adminApiKey,
            ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
    });
    const data = response.status === 204
        ? null
        : await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(
            typeof data?.detail === "string"
                ? data.detail
                : `Backend admin trả lỗi HTTP ${response.status}`
        );
        error.status = response.status;
        throw error;
    }

    return data;
}

// ---------------------------------------------------------------------------
// API-key configuration (editable from public/config.html).
// Values are written to .env and applied to process.env immediately.
// ---------------------------------------------------------------------------

const ENV_FILE = path.join(__dirname, ".env");

function readEnvLines() {
    if (!fs.existsSync(ENV_FILE)) {
        return [];
    }

    return fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/);
}

function updateEnvVars(updates) {
    const lines = readEnvLines();
    const remaining = Object.assign({}, updates);

    const out = lines.map(function (line) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.charAt(0) === "#") {
            return line;
        }

        const eq = trimmed.indexOf("=");

        if (eq === -1) {
            return line;
        }

        const key = trimmed.slice(0, eq).trim();

        if (key in remaining) {
            const value = remaining[key];
            delete remaining[key];
            process.env[key] = value;
            return key + "=" + value;
        }

        return line;
    });

    Object.keys(remaining).forEach(function (key) {
        out.push(key + "=" + remaining[key]);
        process.env[key] = remaining[key];
    });

    fs.writeFileSync(ENV_FILE, out.join("\n"));
}

function maskSecret(value) {
    if (!value) {
        return "";
    }

    if (value.length <= 8) {
        return "********";
    }

    return value.slice(0, 4) + "..." + value.slice(-4);
}

// Once ADMIN_API_KEY is set, the config endpoint requires it via the
// x-admin-api-key header. Before it is first set, setup is allowed so the
// keys can be entered (bootstrap).
function requireAdminKey(req, res, next) {
    const configured = process.env.ADMIN_API_KEY;

    if (!configured) {
        return next();
    }

    const provided = req.get("x-admin-api-key");

    if (!provided || provided !== configured) {
        return res.status(401).json({
            success: false,
            message: "Sai hoặc thiếu ADMIN_API_KEY."
        });
    }

    next();
}

function configStatus() {
    return {
        backendUrl: process.env.SCAM_API_URL || "",
        appApiKeySet: Boolean(process.env.APP_API_KEY),
        appApiKeyMask: maskSecret(process.env.APP_API_KEY),
        adminApiKeySet: Boolean(process.env.ADMIN_API_KEY),
        adminApiKeyMask: maskSecret(process.env.ADMIN_API_KEY)
    };
}

app.get("/api/config", (req, res) => {
    return res.json({ success: true, config: configStatus() });
});

app.post("/api/config", requireAdminKey, (req, res) => {
    try {
        const updates = {};

        const appKey =
            typeof req.body?.app_api_key === "string"
                ? req.body.app_api_key.trim()
                : "";
        const adminKey =
            typeof req.body?.admin_api_key === "string"
                ? req.body.admin_api_key.trim()
                : "";

        if (appKey) {
            updates.APP_API_KEY = appKey;
        }

        if (adminKey) {
            updates.ADMIN_API_KEY = adminKey;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Chưa nhập key nào để lưu."
            });
        }

        updateEnvVars(updates);

        return res.json({
            success: true,
            message: "Đã lưu cấu hình vào .env.",
            config: configStatus()
        });
    } catch (err) {
        console.error("Save config error:", err);

        return res.status(500).json({
            success: false,
            message: "Không ghi được file .env: " + err.message
        });
    }
});

// ---------------------------------------------------------------------------
// Scam-detection analysis
//
// If SCAM_API_URL is set, /ai will POST { message } to that backend and expect
// an object with a `verdict` field (see the sample schema). Otherwise it uses
// a small built-in Vietnamese rule analyzer so the app is testable without an
// external service.
// ---------------------------------------------------------------------------

const WARNING_TOKENS = [
    "công an",
    "chuyển tiền",
    "chuyển khoản",
    "xác minh",
    "vụ án",
    "bảo lãnh",
    "tai nạn",
    "giả danh",
    "điều tra",
    "tòa án",
    "viện kiểm sát",
    "trúng thưởng",
    "nạp tiền",
    "biệt phủ",
    "khóa tài khoản",
    "định danh"
];

const GREETINGS = [
    "hi", "hello", "chào", "xin chào", "alo", "chao", "hey"
];

function normalizeAnalysis(analysis) {
    const a = (analysis && typeof analysis === "object") ? analysis : {};

    return {
        verdict:
            typeof a.verdict === "string" && a.verdict
                ? a.verdict
                : "needs_more_info",
        confidence:
            typeof a.confidence === "number"
                ? a.confidence
                : null,
        evidence: Array.isArray(a.evidence) ? a.evidence : [],
        explanation:
            typeof a.explanation === "string"
                ? a.explanation
                : "",
        suggested_action:
            typeof a.suggested_action === "string"
                ? a.suggested_action
                : "",
        used_llm: !!a.used_llm,
        matched_pattern_id:
            typeof a.matched_pattern_id === "string"
                ? a.matched_pattern_id
                : null,
        sources: Array.isArray(a.sources) ? a.sources : []
    };
}

// Fold Vietnamese to a plain ASCII base so matching is accent-insensitive.
function foldVN(s) {
    return (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
}

function analyzeLocally(message) {
    const lower = " " + foldVN(message) + " ";
    const hits = WARNING_TOKENS.filter(function (token) {
        return lower.indexOf(foldVN(token)) !== -1;
    });

    // 1) Warning: clear scam keywords present.
    if (hits.length > 0) {
        return {
            verdict: "warning",
            confidence: Math.min(0.9 + 0.03 * hits.length, 0.99),
            evidence: hits.slice(0, 10),
            explanation:
                "Nội dung có các dấu hiệu điển hình của lừa đảo " +
                "(giả danh cơ quan chức năng / yêu cầu chuyển tiền gấp).",
            suggested_action:
                "KHÔNG chuyển tiền hoặc làm theo yêu cầu. Gọi cho người " +
                "thân theo số đã lưu sẵn và liên hệ công an địa phương để " +
                "xác minh trước khi thực hiện bất kỳ giao dịch nào.",
            used_llm: false,
            matched_pattern_id: "rule-warning",
            sources: []
        };
    }

    // 2) Needs more info: short message or just a greeting.
    const trimmed = message.trim();
    const isGreeting = GREETINGS.some(function (g) {
        return trimmed.toLowerCase() === g;
    });

    if (isGreeting || trimmed.length < 8) {
        return {
            verdict: "needs_more_info",
            confidence: 0.9,
            evidence: [],
            explanation:
                "Tin nhắn còn ngắn hoặc chưa rõ nội dung, chưa đủ thông tin " +
                "để xác định có phải lừa đảo hay không.",
            suggested_action:
                "Hãy dán nguyên văn cuộc gọi / tin nhắn nghi ngờ để được " +
                "kiểm tra chi tiết hơn.",
            used_llm: true,
            matched_pattern_id: null,
            sources: []
        };
    }

    // 3) Safe / not suspicious.
    return {
        verdict: "safe",
        confidence: 0.9,
        evidence: [],
        explanation:
            "Chưa phát hiện dấu hiệu lừa đảo rõ ràng trong nội dung này.",
        suggested_action:
            "Tiếp tục cẩn thận: không chia sẻ mã OTP, không chuyển tiền " +
            "cho người lạ, và luôn kiểm tra lại bằng cách gọi cho người thân.",
        used_llm: true,
        matched_pattern_id: null,
        sources: []
    };
}

async function getAnalysis(message, userId, conversationId) {
    if (!backendConfigured()) {
        return {
            ...analyzeLocally(message),
            conversation_id: null,
            message_id: null
        };
    }

    const data = await backendUserRequest("/api/chat", userId, {
        method: "POST",
        body: {
            message,
            ...(conversationId ? { conversation_id: conversationId } : {})
        }
    });

    return {
        ...normalizeAnalysis(data),
        conversation_id: data.conversation_id || null,
        message_id: data.message_id || null
    };
}

// Serve the AI chat page as the landing page.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "chat.html"));
});

// Public AI chat endpoint for scam detection.
app.post("/ai", async (req, res) => {
    try {
        const message =
            typeof req.body?.message === "string"
                ? req.body.message.trim()
                : "";

        const name =
            typeof req.body?.name === "string" &&
            req.body.name.trim().length > 0
                ? req.body.name.trim().slice(0, 100)
                : "Anonymous";
        const userId =
            typeof req.body?.user_id === "string"
                ? req.body.user_id.trim()
                : "";
        const conversationId =
            typeof req.body?.conversation_id === "string"
                ? req.body.conversation_id.trim()
                : null;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập nội dung tin nhắn."
            });
        }

        if (backendConfigured() && !userId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu mã người dùng để gọi backend."
            });
        }

        const verdict = await getAnalysis(message, userId, conversationId);

        // A short reply kept for backwards compatibility / plain-text UIs.
        const reply =
            (verdict.explanation || "") +
            (verdict.suggested_action
                ? "\n" + verdict.suggested_action
                : "");

        // FastAPI already stores a masked history. Only the legacy local
        // fallback writes to chat-logs.json, which avoids duplicate raw logs.
        if (!backendConfigured()) {
            appendChatLog({
                timestamp: new Date().toISOString(),
                name,
                message,
                reply,
                verdict
            });
        }

        return res.json({
            success: true,
            reply,
            verdict,
            conversation_id: verdict.conversation_id,
            message_id: verdict.message_id
        });
    } catch (err) {
        console.error("AI request error:", err);

        return res.status(err.status || 500).json({
            success: false,
            message: err.message || "Có lỗi khi xử lý yêu cầu."
        });
    }
});

function userIdFromRequest(req) {
    return typeof req.get("X-User-ID") === "string"
        ? req.get("X-User-ID").trim()
        : "";
}

function sendBackendError(res, err) {
    console.error("Backend proxy error:", err);
    return res.status(err.status || 502).json({
        success: false,
        message: err.message || "Không thể gọi backend."
    });
}

// User-history and feedback proxy endpoints. The browser supplies only its
// stable user UUID; this server adds the secret APP_API_KEY.
app.get("/backend-api/conversations", async (req, res) => {
    try {
        const data = await backendUserRequest(
            "/api/conversations", userIdFromRequest(req)
        );
        return res.json(data);
    } catch (err) {
        return sendBackendError(res, err);
    }
});

app.get("/backend-api/conversations/:conversationId/messages", async (req, res) => {
    try {
        const data = await backendUserRequest(
            `/api/conversations/${encodeURIComponent(req.params.conversationId)}/messages`,
            userIdFromRequest(req)
        );
        return res.json(data);
    } catch (err) {
        return sendBackendError(res, err);
    }
});

app.delete("/backend-api/conversations/:conversationId", async (req, res) => {
    try {
        await backendUserRequest(
            `/api/conversations/${encodeURIComponent(req.params.conversationId)}`,
            userIdFromRequest(req),
            { method: "DELETE" }
        );
        return res.status(204).end();
    } catch (err) {
        return sendBackendError(res, err);
    }
});

app.post("/backend-api/feedback", async (req, res) => {
    try {
        const data = await backendUserRequest(
            "/api/feedback", userIdFromRequest(req),
            { method: "POST", body: req.body }
        );
        return res.json(data);
    } catch (err) {
        return sendBackendError(res, err);
    }
});

// Local-demo admin proxy. ADMIN_API_KEY remains on the Express server and is
// never included in the page source. Before deployment this route must be
// protected by real admin authentication/session middleware.
app.get("/admin-api/stats", async (req, res) => {
    try {
        return res.json(await backendAdminRequest("/api/admin/stats"));
    } catch (err) {
        return sendBackendError(res, err);
    }
});

app.get("/admin-api/feedback", async (req, res) => {
    try {
        const status = ["pending", "approved", "rejected"].includes(req.query.status)
            ? req.query.status
            : "pending";
        const data = await backendAdminRequest(
            `/api/admin/feedback?status=${encodeURIComponent(status)}&limit=200`
        );
        return res.json(data);
    } catch (err) {
        return sendBackendError(res, err);
    }
});

app.put("/admin-api/feedback/:feedbackId/review", async (req, res) => {
    try {
        const data = await backendAdminRequest(
            `/api/admin/feedback/${encodeURIComponent(req.params.feedbackId)}/review`,
            { method: "PUT", body: req.body }
        );
        return res.json(data);
    } catch (err) {
        return sendBackendError(res, err);
    }
});

app.get("/admin-api/patterns", async (req, res) => {
    try {
        return res.json(await backendAdminRequest("/api/admin/patterns"));
    } catch (err) {
        return sendBackendError(res, err);
    }
});

app.post("/admin-api/patterns", async (req, res) => {
    try {
        const data = await backendAdminRequest(
            "/api/admin/patterns", { method: "POST", body: req.body }
        );
        return res.status(201).json(data);
    } catch (err) {
        return sendBackendError(res, err);
    }
});

app.delete("/admin-api/patterns/:patternId", async (req, res) => {
    try {
        await backendAdminRequest(
            `/api/admin/patterns/${encodeURIComponent(req.params.patternId)}`,
            { method: "DELETE" }
        );
        return res.status(204).end();
    } catch (err) {
        return sendBackendError(res, err);
    }
});

// Endpoint to view all recorded chat exchanges from the log file.
app.get("/chat-logs", (req, res) => {
    try {
        let logs = [];

        if (fs.existsSync(CHAT_LOG_FILE)) {
            const parsed = JSON.parse(
                fs.readFileSync(CHAT_LOG_FILE, "utf8")
            );

            if (Array.isArray(parsed)) {
                logs = parsed;
            }
        }

        return res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (err) {
        console.error("Read chat logs error:", err);

        return res.status(500).json({
            success: false,
            message: err.message || "Không đọc được dữ liệu chat."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("AI chat server started on port " + PORT);
});
