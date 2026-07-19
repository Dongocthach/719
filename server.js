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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});