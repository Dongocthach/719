<script setup>
defineProps({
    message: {
        type: Object,
        required: true
    }
});
</script>

<template>
    <div class="msg" :class="message.role">
        {{ message.text }}
    </div>
</template>

<style scoped>
.msg {
    max-width: 760px;
    width: fit-content;
    padding: 12px 16px;
    border-radius: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.msg.user {
    align-self: flex-end;
    color: white;
    background: #2f3037;
    border-bottom-right-radius: 4px;
}

.msg.ai {
    align-self: flex-start;
    color: #ececf1;
    background: #444654;
    border-bottom-left-radius: 4px;
}
</style>
