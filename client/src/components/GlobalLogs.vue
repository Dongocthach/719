<script setup>
import { nextTick, ref } from "vue";

import { api } from "@/api";

/**
 * Global chat log viewer. Replaces the DOM-building showGlobalLog() function
 * from the original chat.html with declarative rendering.
 */

const loading = ref(true);
const errorMessage = ref("");
const logs = ref([]);

async function load() {
    loading.value = true;
    errorMessage.value = "";

    try {
        const json = await api.chatLogs();
        logs.value = (json.logs || []).slice().reverse();
    } catch (error) {
        errorMessage.value = error.message;
    } finally {
        loading.value = false;
    }

    await nextTick();
}

defineExpose({ load });
</script>

<template>
    <div class="log-view">
        <div class="log-header">🌐 Global Logs</div>

        <div v-if="loading" class="msg ai typing">
            Loading...
        </div>

        <div v-else-if="errorMessage" class="msg ai">
            Error: {{ errorMessage }}
        </div>

        <template v-else>
            <div class="log-sub">
                {{ logs.length }} record(s) in chat-logs.json
            </div>

            <div v-if="logs.length === 0" class="msg ai">
                No chat records yet.
            </div>

            <div
                v-for="(log, index) in logs"
                :key="index"
                class="log-card"
            >
                <div class="row">
                    <span class="name">{{ log.name || "Anonymous" }}</span>
                    <span class="time">{{ log.timestamp || "" }}</span>
                </div>

                <div class="row label">Message</div>
                <div class="row">{{ log.message || "" }}</div>

                <div class="row label">Reply</div>
                <div class="row">{{ log.reply || "" }}</div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.log-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
}

.log-header {
    align-self: center;
    text-align: center;
    margin-bottom: 6px;
    color: #ffffff;
    font-size: 18px;
    font-weight: bold;
}

.log-sub {
    align-self: center;
    color: #b3b3c0;
    font-size: 13px;
    margin-bottom: 10px;
}

.msg {
    max-width: 760px;
    width: fit-content;
    padding: 12px 16px;
    border-radius: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    align-self: flex-start;
    color: #ececf1;
    background: #444654;
    border-bottom-left-radius: 4px;
}

.msg.typing {
    color: #b3b3c0;
    font-style: italic;
}

.log-card {
    width: 100%;
    max-width: 760px;
    align-self: center;
    padding: 14px 16px;
    border-radius: 10px;
    color: #ececf1;
    background: #2f3037;
    border: 1px solid #3f4049;
}

.row {
    margin-bottom: 6px;
    line-height: 1.5;
    overflow-wrap: anywhere;
}

.row:last-child {
    margin-bottom: 0;
}

.name {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    color: white;
    background: #10a37f;
    font-size: 12px;
    font-weight: bold;
}

.time {
    float: right;
    color: #8e8ea0;
    font-size: 12px;
}

.label {
    color: #8e8ea0;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.4px;
}
</style>
