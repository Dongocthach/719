require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const UnityCloudCodeClient = require("./unityCloudCodeClient");

const unity = new UnityCloudCodeClient();

const app = express();

app.use(express.json());

// File that records every AI chat exchange (name, message, reply).
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

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

function requireAdminApiKey(req, res, next) {

    const providedKey = req.get("x-admin-api-key");

    console.log("========== Admin API Request ==========");
    console.log("Time:", new Date().toISOString());
    console.log("IP:", req.ip);
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("User-Agent:", req.get("User-Agent"));

    if (!process.env.ADMIN_API_KEY) {
        console.error("ADMIN_API_KEY environment variable is NOT configured.");

        return res.status(500).json({
            success: false,
            message: "Server configuration error."
        });
    }

    if (!providedKey) {

        console.warn("Request rejected: Missing x-admin-api-key header.");

        return res.status(401).json({
            success: false,
            message: "Missing API key."
        });
    }

    if (providedKey !== process.env.ADMIN_API_KEY) {

        console.warn("Request rejected: Invalid API key.");
        console.warn("Received:", providedKey);

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });
    }

    console.log("Authentication successful.");
    console.log("======================================");

    next();
}

app.post("/say-hello", requireAdminApiKey, async (req, res) => {
    try {
        const name = req.body.name;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Please enter a name."
            });
        }

        const result = await unity.callModuleFunction(
            "SayHello",
            {
                name
            }
        );

        res.json({
            success: true,
            result
        });
    }
    catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

app.post("/DeletePlayerDataByPlayerId", requireAdminApiKey, async (req, res) => {
    try {
        const playerId =
            typeof req.body?.playerId === "string"
                ? req.body.playerId.trim()
                : "";

        if (!playerId) {
            return res.status(400).json({
                success: false,
                message: "Player ID is required."
            });
        }

        const result = await unity.callModuleFunction(
            "DeletePlayerDataByPlayerId",
            {
                playerId
            }
        );

        return res.json({
            success: true,
            message: "Player Cloud Save data deleted successfully.",
            playerId,
            result
        });
    } catch (err) {
        console.error("Delete player data error:", err);

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to delete player data."
        });
    }
});


// Public AI chat endpoint (no admin key required).
// Currently a stub — replace the reply logic with a real AI
// backend (or a Unity Cloud Code function) when ready.
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

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Please enter a message."
            });
        }

        // ---- STUB REPLY ----
        // Swap this block for a call to your real AI backend,
        // e.g.:
        //   const result = await unity.callModuleFunction(
        //       "YourAiFunction",
        //       { message }
        //   );
        const reply =
            "Hi! You said: \"" + message + "\". " +
            "This is a stub reply from the /ai endpoint — " +
            "connect a real AI backend to get actual answers.";

        // Record the exchange (name + chat content) to a JSON file.
        appendChatLog({
            timestamp: new Date().toISOString(),
            name,
            message,
            reply
        });

        return res.json({
            success: true,
            reply
        });
    } catch (err) {
        console.error("AI request error:", err);

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to process AI request."
        });
    }
});

// Public endpoint to view all recorded chat exchanges from the log file.
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
            message: err.message || "Failed to read chat logs."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});