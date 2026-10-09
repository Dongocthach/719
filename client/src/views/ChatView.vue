<script setup>
import { nextTick, onMounted, ref, watch } from "vue";

import { api } from "@/api";
import ChatMessage from "@/components/ChatMessage.vue";
import ChatSidebar from "@/components/ChatSidebar.vue";
import GlobalLogs from "@/components/GlobalLogs.vue";
import { useConversations } from "@/composables/useConversations";

const {
    sortedConversations,
    currentId,
    messages,
    userName,
    needsName,
    createConversation,
    selectConversation,
    deleteConversation,
    ensureConversation,
    addMessage,
    saveUserName
} = useConversations();

/** "chat" or "logs" — the original swapped the window's innerHTML. */
const view = ref("chat");

const draft = ref("");
const busy = ref(false);
const editingName = ref(false);

const chatWindow = ref(null);
const logsPanel = ref(null);
const messageInput = ref(null);

function scrollToBottom() {
    const el = chatWindow.value;

    if (el) {
        el.scrollTop = el.scrollHeight;
    }
}

watch(
    [() => messages.value.length, busy, view],
    async () => {
        await nextTick();
        scrollToBottom();
    }
);

onMounted(() => {
    if (!currentId.value) {
        createConversation();
    }

    // First visit: open the inline name editor instead of window.prompt().
    if (needsName.value) {
        editingName.value = true;
    }

    focusComposer();
});

async function focusComposer() {
    await nextTick();

    if (messageInput.value) {
        messageInput.value.focus();
    }
}

function handleNewChat() {
    createConversation();
    view.value = "chat";
    focusComposer();
}

function handleSelect(id) {
    selectConversation(id);
    view.value = "chat";
}

function handleDelete(id) {
    deleteConversation(id);
}

function handleSaveName(value) {
    saveUserName(value);
    editingName.value = false;
}

async function showLogs() {
    view.value = "logs";

    await nextTick();

    if (logsPanel.value) {
        await logsPanel.value.load();
        scrollToBottom();
    }
}

async function send() {
    const message = draft.value.trim();

    if (!message || busy.value) {
        return;
    }

    view.value = "chat";

    ensureConversation();
    addMessage("user", message);

    draft.value = "";
    busy.value = true;

    try {
        const json = await api.ask(userName.value, message);
        const reply = json.reply || "(no reply)";

        addMessage("ai", reply);
    } catch (error) {
        // The original only mutated the typing bubble, so the error
        // vanished on the next re-render. Persist it instead.
        addMessage("ai", "Something went wrong: " + error.message);
    } finally {
        busy.value = false;
        focusComposer();
    }
}
</script>

<template>
    <div class="chat-shell">
        <ChatSidebar
            :conversations="sortedConversations"
            :current-id="currentId"
            :user-name="userName"
            :editing-name="editingName"
            :show-logs="view === 'logs'"
            @new-chat="handleNewChat"
            @select="handleSelect"
            @delete="handleDelete"
            @save-name="handleSaveName"
            @toggle-name-editor="editingName = $event"
            @show-logs="showLogs"
        />

        <main class="chat-area">
            <div ref="chatWindow" class="chat-window">
                <GlobalLogs v-if="view === 'logs'" ref="logsPanel" />

                <template v-else>
                    <div
                        v-if="messages.length === 0 && !busy"
                        class="chat-empty"
                    >
                        <h1>Ask me anything</h1>
                        <p>Start a new chat and type a message below.</p>
                    </div>

                    <ChatMessage
                        v-for="(message, index) in messages"
                        :key="index"
                        :message="message"
                    />

                    <div v-if="busy" class="msg ai typing">
                        Thinking...
                    </div>
                </template>
            </div>

            <form class="input-bar" @submit.prevent="send">
                <input
                    ref="messageInput"
                    v-model="draft"
                    type="text"
                    placeholder="Type your message..."
                    autocomplete="off"
                    aria-label="Message"
                    required
                >

                <button type="submit" :disabled="busy">
                    {{ busy ? "Sending..." : "Send" }}
                </button>
            </form>
        </main>
    </div>
</template>

<style scoped>
.chat-shell {
    display: flex;
    min-height: 100vh;
    color: #ececf1;
    background: #343541;
}

.chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100vh;
}

.chat-window {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.chat-empty {
    margin: auto;
    max-width: 520px;
    text-align: center;
    color: #b3b3c0;
}

.chat-empty h1 {
    font-size: 26px;
    color: #ffffff;
}

.msg {
    max-width: 760px;
    width: fit-content;
    padding: 12px 16px;
    border-radius: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.msg.ai {
    align-self: flex-start;
    color: #ececf1;
    background: #444654;
    border-bottom-left-radius: 4px;
}

.msg.ai.typing {
    color: #b3b3c0;
    font-style: italic;
}

.input-bar {
    display: flex;
    gap: 10px;
    padding: 14px 24px 20px;
    max-width: 820px;
    width: 100%;
    margin: 0 auto;
}

.input-bar input {
    flex: 1;
    padding: 13px 16px;
    border: 1px solid #565869;
    border-radius: 10px;
    color: white;
    background: #40414f;
    font-size: 16px;
    outline: none;
}

.input-bar input::placeholder {
    color: #8e8ea0;
}

.input-bar input:focus {
    border-color: #10a37f;
    box-shadow: 0 0 0 3px rgba(16, 163, 127, 0.18);
}

.input-bar button {
    width: auto;
    margin: 0;
    padding: 13px 22px;
    border-radius: 10px;
    background: #10a37f;
}

.input-bar button:hover:not(:disabled) {
    background: #0e916f;
}

@media (max-width: 700px) {
    .chat-shell {
        flex-direction: column;
    }

    .chat-area {
        height: 60vh;
    }
}
</style>
