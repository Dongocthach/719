require("dotenv").config();

const express = require("express");
const path = require("path");

const UnityCloudCodeClient = require("./unityCloudCodeClient");

const unity = new UnityCloudCodeClient();

const app = express();

app.use(express.json());

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


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});