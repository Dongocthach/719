import { computed, ref, watch } from "vue";

/**
 * Chat state, persisted to localStorage.
 *
 * The refs are declared at module scope on purpose: ChatView is a lazily
 * loaded route component, so component-local state would be thrown away
 * every time the user navigates back to the admin page.
 */

const STORAGE_KEY = "duyanhtod_ai_conversations";
const NAME_KEY = "duyanhtod_ai_user_name";

const DEFAULT_NAME = "Anonymous";

function readStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : raw;
    } catch {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage unavailable (private mode, quota): keep working in memory.
    }
}

function loadConversations() {
    try {
        const parsed = JSON.parse(readStorage(STORAGE_KEY, "[]"));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

const conversations = ref(loadConversations());

const currentId = ref(
    conversations.value.length > 0 ? conversations.value[0].id : null
);

const userName = ref(readStorage(NAME_KEY, "") || DEFAULT_NAME);

/** True while the very first name has not been confirmed yet. */
const needsName = ref(readStorage(NAME_KEY, "") === "");

const currentConversation = computed(
    () =>
        conversations.value.find((c) => c.id === currentId.value) || null
);

const messages = computed(() =>
    currentConversation.value ? currentConversation.value.messages : []
);

const sortedConversations = computed(() =>
    conversations.value.slice().reverse()
);

// Persist on every mutation.
watch(
    conversations,
    (value) => writeStorage(STORAGE_KEY, JSON.stringify(value)),
    { deep: true }
);

watch(userName, (value) => writeStorage(NAME_KEY, value));

function newId() {
    return Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function createConversation() {
    const conversation = {
        id: newId(),
        title: "New Chat",
        messages: []
    };

    conversations.value.push(conversation);
    currentId.value = conversation.id;

    return conversation;
}

function selectConversation(id) {
    currentId.value = id;
}

function deleteConversation(id) {
    conversations.value = conversations.value.filter((c) => c.id !== id);

    if (currentId.value === id) {
        currentId.value = conversations.value.length
            ? conversations.value[0].id
            : null;
    }
}

/**
 * Returns the active conversation, creating one when none exists.
 */
function ensureConversation() {
    return currentConversation.value || createConversation();
}

function addMessage(role, text) {
    const conversation = ensureConversation();

    // The first user message becomes the sidebar title.
    if (conversation.messages.length === 0 && role === "user") {
        conversation.title = text.slice(0, 40);
    }

    conversation.messages.push({ role, text });

    return conversation;
}

function saveUserName(value) {
    const trimmed = typeof value === "string" ? value.trim() : "";

    userName.value = trimmed ? trimmed.slice(0, 100) : DEFAULT_NAME;
    needsName.value = false;
}

export function useConversations() {
    return {
        conversations,
        sortedConversations,
        currentId,
        currentConversation,
        messages,
        userName,
        needsName,
        createConversation,
        selectConversation,
        deleteConversation,
        ensureConversation,
        addMessage,
        saveUserName
    };
}
