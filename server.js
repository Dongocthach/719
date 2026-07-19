require("dotenv").config();

const express = require("express");
const path = require("path");

const UnityCloudCodeClient = require("./unityCloudCodeClient");

const unity = new UnityCloudCodeClient();

const app = express();

app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

  app.post("/say-hello", async (req, res) => {
    try {
        const name =
            typeof req.body?.name === "string"
                ? req.body.name.trim()
                : "";

        if (!name) {
            return res.status(400).json({
                error: "The name field is required."
            });
        }

        const result = await unity.callModuleFunction(
            "SayHello",
            { name }
        );
        

        return res.json(result);
    } catch (error) {
        console.error(error);

        return res.status(502).json({
            error: "Cloud Code request failed."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});