const express = require("express");
const path = require("path");
const fs = require("fs");

// Load key=value lines from .env (dependency-free dotenv).
(function loadEnv() {
    const envPath = path.join(__dirname, ".env");

    if (!fs.existsSync(envPath)) {
        return;
    }

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

    lines.forEach(function (line) {
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

// The backend returns a conversation history like:
// { conversation_id, messages: [ {role, content}, ... ] }
// where the last "assistant" message's content is the verdict object.
function extractVerdictFromConversation(data) {
    if (!data || typeof data !== "object") {
        return null;
    }

    if (data.verdict || data.matched_pattern_id ||
        data.suggested_action) {
        // The response is already a single verdict object.
        return data;
    }

    const messages = Array.isArray(data.messages) ? data.messages : [];

    for (let i = messages.length - 1; i >= 0; i--) {
        const content = messages[i] && messages[i].content;

        if (content && typeof content === "object" &&
            content.verdict) {
            return content;
        }
    }

    return null;
}

async function getAnalysis(message, conversationId, userId) {
    const backendUrl = process.env.SCAM_API_URL;

    if (backendUrl) {
        const headers = {
            "Content-Type": "application/json"
        };

        // The backend requires an X-User-ID header that must be a UUID.
        if (userId || process.env.SCAM_USER_ID) {
            headers["X-User-ID"] = userId || process.env.SCAM_USER_ID;
        }

        const keyHeader =
            process.env.SCAM_API_KEY_HEADER || "x-api-key";

        if (keyHeader && process.env.SCAM_API_KEY) {
            headers[keyHeader] = process.env.SCAM_API_KEY;
        }

        try {
            const response = await fetch(backendUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    conversation_id: conversationId || "",
                    message
                })
            });

            if (!response.ok) {
                throw new Error(
                    "Scam backend returned " + response.status
                );
            }

            const data = await response.json();
            const analysis = extractVerdictFromConversation(data);

            if (!analysis) {
                throw new Error(
                    "Scam backend response did not contain a verdict."
                );
            }

            return normalizeAnalysis(analysis);
        } catch (err) {
            // If the remote backend fails, fall back to local rules so
            // the app still responds.
            console.error(
                "Scam backend failed, using local analyzer:",
                err.message
            );

            return analyzeLocally(message);
        }
    }

    return analyzeLocally(message);
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

        const conversationId =
            typeof req.body?.conversation_id === "string"
                ? req.body.conversation_id.slice(0, 100)
                : "";

        const userId =
            typeof req.body?.user_id === "string"
                ? req.body.user_id.slice(0, 100)
                : "";

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập nội dung tin nhắn."
            });
        }

        const verdict = await getAnalysis(message, conversationId, userId);

        // A short reply kept for backwards compatibility / plain-text UIs.
        const reply =
            (verdict.explanation || "") +
            (verdict.suggested_action
                ? "\n" + verdict.suggested_action
                : "");

        // Record the full verdict alongside the message.
        appendChatLog({
            timestamp: new Date().toISOString(),
            name,
            message,
            reply,
            conversation_id: conversationId || null,
            verdict
        });

        return res.json({
            success: true,
            reply,
            verdict
        });
    } catch (err) {
        console.error("AI request error:", err);

        return res.status(500).json({
            success: false,
            message: err.message || "Có lỗi khi xử lý yêu cầu."
        });
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
