/**
 * Single entry point for every backend call.
 *
 * Two things the original vanilla pages got wrong and this layer fixes:
 *
 *  1. /say-hello and /DeletePlayerDataByPlayerId require an
 *     `x-admin-api-key` header. Neither page sent one, so both tools always
 *     returned 401. The key is now read from localStorage and attached
 *     automatically for any request flagged `admin: true`.
 *
 *  2. Error handling was duplicated in every page. It now lives here, so a
 *     non-2xx response always surfaces the server's own message.
 */

const ADMIN_KEY_STORAGE = "duyanhtod_admin_api_key";

export function getAdminKey() {
    try {
        return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
    } catch {
        return "";
    }
}

export function setAdminKey(value) {
    try {
        const trimmed = typeof value === "string" ? value.trim() : "";

        if (trimmed) {
            localStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
        } else {
            localStorage.removeItem(ADMIN_KEY_STORAGE);
        }
    } catch {
        // Private browsing / storage disabled: the key simply is not persisted.
    }
}

export function hasAdminKey() {
    return getAdminKey().length > 0;
}

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

async function request(url, options = {}) {
    const { method = "GET", body, admin = false } = options;

    const headers = {};

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    if (admin) {
        const key = getAdminKey();

        if (!key) {
            throw new ApiError(
                "No admin API key set. Open Admin API Key and paste " +
                "ADMIN_API_KEY from your .env file.",
                0
            );
        }

        headers["x-admin-api-key"] = key;
    }

    let response;

    try {
        response = await fetch(url, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch (networkError) {
        throw new ApiError(
            "Could not reach the server. Is it running on port 3000? " +
            "(" + networkError.message + ")",
            0
        );
    }

    const responseText = await response.text();

    let data = null;

    try {
        data = responseText ? JSON.parse(responseText) : null;
    } catch {
        data = null;
    }

    if (response.status === 401) {
        throw new ApiError(
            (data && data.message) ||
            "Unauthorized. Check the admin API key in Admin API Key.",
            401
        );
    }

    if (!response.ok || (data && data.success === false)) {
        throw new ApiError(
            (data && data.message) ||
            "Request failed (HTTP " + response.status + ").",
            response.status
        );
    }

    return data;
}

/**
 * Cloud Code returns its payload in one of several shapes depending on the
 * module. Collapse them to displayable text.
 */
export function extractCloudCodeResult(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value.output === "string") {
        return value.output;
    }

    if (typeof value.result === "string") {
        return value.result;
    }

    if (typeof value.data === "string") {
        return value.data;
    }

    return JSON.stringify(value, null, 2);
}

export const api = {
    /** Admin: calls the SayHello Cloud Code function. */
    sayHello(name) {
        return request("/say-hello", {
            method: "POST",
            body: { name },
            admin: true
        });
    },

    /** Admin: deletes a player's Cloud Save document. */
    deletePlayerData(playerId) {
        return request("/DeletePlayerDataByPlayerId", {
            method: "POST",
            body: { playerId },
            admin: true
        });
    },

    /** Public: AI chat. */
    ask(name, message) {
        return request("/ai", {
            method: "POST",
            body: { name, message }
        });
    },

    /** Public: every recorded chat exchange. */
    chatLogs() {
        return request("/chat-logs");
    }
};
