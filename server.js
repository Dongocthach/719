require("dotenv").config();

const express = require("express");
const UnityCloudCodeClient = require("./unityCloudCodeClient");

const app = express();
const port = process.env.PORT || 3000;

const unity = new UnityCloudCodeClient();

app.use(express.json());

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

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});