<script setup>
defineProps({
    message: {
        type: String,
        default: ""
    },

    // "success" | "error" | "" (hidden)
    type: {
        type: String,
        default: ""
    }
});
</script>

<template>
    <div
        v-if="message"
        class="result"
        :class="type"
        role="status"
        aria-live="polite"
    >{{ message }}</div>
</template>

<style scoped>
.result {
    margin-top: 20px;
    padding: 12px;
    border-radius: 8px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.result.success {
    color: #166534;
    background: #dcfce7;
    border: 1px solid #86efac;
}

.result.error {
    color: #991b1b;
    background: #fee2e2;
    border: 1px solid #fca5a5;
}
</style>
