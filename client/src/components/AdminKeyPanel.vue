<script setup>
import { onMounted, ref } from "vue";

import { getAdminKey, setAdminKey } from "@/api";

/**
 * The admin endpoints require an `x-admin-api-key` header. The original
 * index.html never sent one, so both tools always failed with 401. This
 * panel is where that key is supplied.
 */

const open = ref(false);

const keyInput = ref("");
const savedKey = ref("");

const statusMessage = ref("");
const statusType = ref("");

function refresh() {
    savedKey.value = getAdminKey();
}

function save() {
    const trimmed = keyInput.value.trim();

    if (!trimmed) {
        statusMessage.value = "Enter a key before saving.";
        statusType.value = "error";
        return;
    }

    setAdminKey(trimmed);
    refresh();

    keyInput.value = "";

    statusMessage.value = "Admin API key saved in this browser.";
    statusType.value = "success";
}

function clear() {
    setAdminKey("");
    refresh();

    statusMessage.value = "Admin API key removed from this browser.";
    statusType.value = "success";
}

onMounted(refresh);
</script>

<template>
    <section class="key-panel">
        <button
            class="toggle"
            type="button"
            :aria-expanded="open"
            @click="open = !open"
        >
            <span>🔑 Admin API Key</span>

            <span class="state" :class="{ ok: savedKey }">
                {{ savedKey ? "Set" : "Not set" }}
            </span>

            <span class="chevron">{{ open ? "▲" : "▼" }}</span>
        </button>

        <div v-if="open" class="body">
            <p class="hint">
                The <strong>Say Hello</strong> and
                <strong>Delete Player Data</strong> tools call endpoints
                protected by <code>x-admin-api-key</code>. Paste the same
                value as <code>ADMIN_API_KEY</code> in your
                <code>.env</code> file.
            </p>

            <p class="hint warn">
                The key is stored in this browser's localStorage and sent
                directly to the server. Anyone with access to this browser
                profile can read it.
            </p>

            <form @submit.prevent="save">
                <label for="adminKey">
                    Admin API key
                </label>

                <input
                    id="adminKey"
                    v-model="keyInput"
                    type="password"
                    autocomplete="off"
                    placeholder="Paste ADMIN_API_KEY"
                >

                <div class="actions">
                    <button type="submit">
                        Save key
                    </button>

                    <button
                        type="button"
                        class="secondary"
                        :disabled="!savedKey"
                        @click="clear"
                    >
                        Clear
                    </button>
                </div>
            </form>

            <p
                v-if="statusMessage"
                class="status"
                :class="statusType"
                role="status"
            >{{ statusMessage }}</p>
        </div>
    </section>
</template>

<style scoped>
.key-panel {
    max-width: 1000px;
    margin: 0 auto 25px;
    border-radius: 14px;
    background: white;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.09);
    overflow: hidden;
}

.toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin: 0;
    padding: 16px 22px;
    border: none;
    border-radius: 0;
    background: white;
    color: #202124;
    font-size: 16px;
    font-weight: bold;
    text-align: left;
    cursor: pointer;
}

.toggle:hover {
    background: #f8fafc;
}

.toggle span:first-child {
    flex: 1;
}

.state {
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: bold;
    color: #991b1b;
    background: #fee2e2;
}

.state.ok {
    color: #166534;
    background: #dcfce7;
}

.chevron {
    color: #5f6368;
    font-size: 12px;
}

.body {
    padding: 4px 22px 22px;
    border-top: 1px solid #e5e7eb;
}

.hint {
    margin: 16px 0 0;
    color: #5f6368;
    font-size: 14px;
    line-height: 1.6;
}

.hint.warn {
    color: #92400e;
}

code {
    padding: 1px 5px;
    border-radius: 4px;
    background: #f1f5f9;
    font-size: 13px;
}

.actions {
    display: flex;
    gap: 12px;
}

.actions button {
    width: auto;
    flex: 1;
}

.actions .secondary {
    background: #64748b;
}

.actions .secondary:hover:not(:disabled) {
    background: #475569;
}

.status {
    margin: 16px 0 0;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 14px;
}

.status.success {
    color: #166534;
    background: #dcfce7;
}

.status.error {
    color: #991b1b;
    background: #fee2e2;
}
</style>
