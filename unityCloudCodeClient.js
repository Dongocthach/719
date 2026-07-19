require("dotenv").config();

class UnityCloudCodeClient {
    constructor(options = {}) {
        this.projectId =
            options.projectId ?? process.env.UNITY_PROJECT_ID;

        this.environmentId =
            options.environmentId ?? process.env.UNITY_ENVIRONMENT_ID;

        this.keyId =
            options.keyId ?? process.env.UNITY_SERVICE_ACCOUNT_KEY_ID;

        this.secretKey =
            options.secretKey ?? process.env.UNITY_SERVICE_ACCOUNT_SECRET_KEY;

        this.moduleName =
            options.moduleName ??
            process.env.UNITY_CLOUD_CODE_MODULE ??
            "DuyAnhTodCloud2";

        this.accessToken = null;
        this.accessTokenExpiresAtMs = 0;

        this.validateConfiguration();
    }

    validateConfiguration() {
        const missing = [];

        if (!this.projectId) missing.push("UNITY_PROJECT_ID");
        if (!this.environmentId) missing.push("UNITY_ENVIRONMENT_ID");
        if (!this.keyId) missing.push("UNITY_SERVICE_ACCOUNT_KEY_ID");
        if (!this.secretKey) {
            missing.push("UNITY_SERVICE_ACCOUNT_SECRET_KEY");
        }

        if (missing.length > 0) {
            throw new Error(
                `Missing Unity configuration: ${missing.join(", ")}`
            );
        }
    }

    /**
     * Decode only the JWT payload.
     *
     * This does not validate the signature. It is used only to read the
     * expiration time of a token already received directly from Unity.
     */
    decodeJwtPayload(token) {
        const parts = token.split(".");

        if (parts.length !== 3) {
            throw new Error(
                "Unity token is not a valid three-section JWT."
            );
        }

        const base64UrlPayload = parts[1];

        const base64Payload = base64UrlPayload
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(
                Math.ceil(base64UrlPayload.length / 4) * 4,
                "="
            );

        const json = Buffer.from(base64Payload, "base64").toString("utf8");

        return JSON.parse(json);
    }

    tokenNeedsRefresh() {
        if (!this.accessToken) {
            return true;
        }

        // Refresh 60 seconds before expiration.
        const refreshBufferMs = 60_000;

        return (
            Date.now() + refreshBufferMs >=
            this.accessTokenExpiresAtMs
        );
    }

    async exchangeToken() {
        const url = new URL(
            "https://services.api.unity.com/auth/v2/token-exchange"
        );

        url.searchParams.set("projectId", this.projectId);
        url.searchParams.set("environmentId", this.environmentId);

        // Basic Authentication is Base64(KeyId:SecretKey).
        const credentials = Buffer.from(
            `${this.keyId}:${this.secretKey}`,
            "utf8"
        ).toString("base64");

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                scopes: []
            })
        });

        const responseText = await response.text();

        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = { rawResponse: responseText };
        }

        if (!response.ok) {
            throw new Error(
                `Unity token exchange failed (${response.status}): ` +
                JSON.stringify(data)
            );
        }

        if (
            typeof data.accessToken !== "string" ||
            data.accessToken.length === 0
        ) {
            throw new Error(
                "Unity token exchange response did not contain accessToken."
            );
        }

        const payload = this.decodeJwtPayload(data.accessToken);

        if (typeof payload.exp !== "number") {
            throw new Error(
                "Unity JWT does not contain a numeric exp claim."
            );
        }

        this.accessToken = data.accessToken;
        this.accessTokenExpiresAtMs = payload.exp * 1000;

        console.log(
            "Unity token obtained. Expires:",
            new Date(this.accessTokenExpiresAtMs).toISOString()
        );

        return this.accessToken;
    }

    async getAccessToken(forceRefresh = false) {
        if (forceRefresh || this.tokenNeedsRefresh()) {
            return this.exchangeToken();
        }

        return this.accessToken;
    }

    async callModuleFunction(
        functionName,
        parameters = {},
        retryAfterUnauthorized = true
    ) {
        if (!functionName) {
            throw new Error("Cloud Code function name is required.");
        }

        const token = await this.getAccessToken();

        const moduleSegment = encodeURIComponent(this.moduleName);
        const functionSegment = encodeURIComponent(functionName);

        const url =
            `https://cloud-code.services.api.unity.com/v1/projects/` +
            `${encodeURIComponent(this.projectId)}/modules/` +
            `${moduleSegment}/${functionSegment}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                params: parameters
            })
        });

        // Token may have expired or been rejected.
        // Refresh it and retry only once.
        if (response.status === 401 && retryAfterUnauthorized) {
            this.accessToken = null;
            this.accessTokenExpiresAtMs = 0;

            await this.getAccessToken(true);

            return this.callModuleFunction(
                functionName,
                parameters,
                false
            );
        }

        const responseText = await response.text();

        let data;
        try {
            data = responseText ? JSON.parse(responseText) : null;
        } catch {
            data = responseText;
        }

        if (!response.ok) {
            throw new Error(
                `Cloud Code request failed (${response.status}): ` +
                (typeof data === "string"
                    ? data
                    : JSON.stringify(data))
            );
        }

        return data;
    }
}

module.exports = UnityCloudCodeClient;