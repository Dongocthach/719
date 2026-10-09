<script setup>
import { computed, nextTick, ref } from "vue";

const props = defineProps({
    conversations: {
        type: Array,
        required: true
    },

    currentId: {
        type: String,
        default: null
    },

    userName: {
        type: String,
        required: true
    },

    /**
     * The original page used window.prompt() on first visit. An inline
     * editor is used instead: it is testable, does not break in sandboxed
     * iframes, and matches how the rest of the UI works.
     */
    editingName: {
        type: Boolean,
        default: false
    },

    showLogs: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    "new-chat",
    "select",
    "delete",
    "show-logs",
    "save-name",
    "toggle-name-editor"
]);

const draftName = ref("");
const nameInput = ref(null);

const avatarLetter = computed(() =>
    (props.userName || "U").trim().charAt(0).toUpperCase() || "U"
);

async function startEditing() {
    draftName.value = props.userName;

    emit("toggle-name-editor", true);

    await nextTick();

    if (nameInput.value) {
        nameInput.value.focus();
        nameInput.value.select();
    }
}

function saveName() {
    emit("save-name", draftName.value);
}

function cancelEditing() {
    emit("toggle-name-editor", false);
}
</script>

<template>
    <aside class="sidebar">
        <div class="logo">
            <div class="logo-badge">✦</div>
            AI
        </div>

        <button
            class="new-chat-btn"
            type="button"
            @click="emit('new-chat')"
        >
            ✚ New Chat
        </button>

        <div class="history">
            <div class="history-title">Chat History</div>

            <div v-if="conversations.length === 0" class="history-empty">
                No conversations yet.
            </div>

            <ul class="history-list">
                <li
                    v-for="conversation in conversations"
                    :key="conversation.id"
                >
                    <button
                        class="history-item"
                        :class="{ active: conversation.id === currentId && !showLogs }"
                        type="button"
                        @click="emit('select', conversation.id)"
                    >
                        <span class="title">
                            {{ conversation.title || "New Chat" }}
                        </span>

                        <span
                            class="del"
                            role="button"
                            tabindex="0"
                            title="Delete chat"
                            @click.stop="emit('delete', conversation.id)"
                            @keydown.enter.stop="emit('delete', conversation.id)"
                        >✕</span>
                    </button>
                </li>
            </ul>
        </div>

        <button
            class="global-btn"
            type="button"
            @click="emit('show-logs')"
        >
            🌐 Global Logs
        </button>

        <div class="profile">
            <div class="avatar">{{ avatarLetter }}</div>

            <template v-if="editingName">
                <form class="name-editor" @submit.prevent="saveName">
                    <input
                        ref="nameInput"
                        v-model="draftName"
                        type="text"
                        maxlength="100"
                        placeholder="Your name"
                        aria-label="Your name"
                        @keydown.esc="cancelEditing"
                    >

                    <div class="editor-actions">
                        <button type="submit">Save</button>
                        <button type="button" @click="cancelEditing">
                            Cancel
                        </button>
                    </div>
                </form>
            </template>

            <template v-else>
                <div class="name">{{ userName }}</div>

                <button
                    class="icon"
                    type="button"
                    title="Change name"
                    aria-label="Change name"
                    @click="startEditing"
                >⚙</button>
            </template>
        </div>
    </aside>
</template>

<style scoped>
.sidebar {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: #202123;
    border-right: 1px solid #2d2d35;
    height: 100vh;
}

.logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 16px;
    font-size: 17px;
    font-weight: bold;
    color: #ffffff;
}

.logo-badge {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: linear-gradient(135deg, #10a37f, #0e7490);
    color: white;
    font-size: 16px;
}

.new-chat-btn {
    margin: 6px 16px 14px;
    padding: 11px 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 8px;
    color: white;
    background: #2f3037;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
}

.new-chat-btn:hover {
    background: #40414f;
}

.history {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
}

.history-title {
    padding: 6px 10px;
    font-size: 11px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #8e8ea0;
}

.history-empty {
    padding: 10px;
    font-size: 13px;
    color: #6e6e80;
}

.history-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.history-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 10px;
    margin: 0 0 2px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #d1d5db;
    font-size: 14px;
    font-weight: normal;
    text-align: left;
    cursor: pointer;
}

.history-item:hover {
    background: #2f3037;
}

.history-item.active {
    background: #343541;
    color: #ffffff;
}

.title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.del {
    color: #8e8ea0;
    font-size: 14px;
    cursor: pointer;
    padding: 2px 4px;
    visibility: hidden;
}

.history-item:hover .del,
.del:focus-visible {
    visibility: visible;
}

.del:hover {
    color: #ef4444;
}

.global-btn {
    margin: 4px 8px 10px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 8px;
    color: #d1d5db;
    background: #2f3037;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
}

.global-btn:hover {
    background: #40414f;
    color: white;
}

.profile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-top: 1px solid #2d2d35;
}

.avatar {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #40414f;
    color: white;
    font-size: 14px;
    font-weight: bold;
}

.name {
    flex: 1;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.icon {
    width: auto;
    margin: 0;
    padding: 4px;
    background: none;
    border: none;
    color: #d1d5db;
    font-size: 16px;
    cursor: pointer;
}

.icon:hover {
    background: none;
    color: white;
}

.name-editor {
    flex: 1;
    min-width: 0;
}

.name-editor input {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #565869;
    border-radius: 6px;
    color: white;
    background: #40414f;
    font-size: 13px;
    outline: none;
}

.name-editor input:focus {
    border-color: #10a37f;
}

.editor-actions {
    display: flex;
    gap: 6px;
    margin-top: 6px;
}

.editor-actions button {
    width: auto;
    flex: 1;
    margin: 0;
    padding: 5px 8px;
    border-radius: 6px;
    background: #10a37f;
    font-size: 12px;
}

.editor-actions button:last-child {
    background: #565869;
}

@media (max-width: 700px) {
    .sidebar {
        width: 100%;
        height: auto;
        max-height: 40vh;
        border-right: none;
        border-bottom: 1px solid #2d2d35;
    }
}
</style>
