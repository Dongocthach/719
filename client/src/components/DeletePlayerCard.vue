<script setup>
import { ref } from "vue";

import { api } from "@/api";
import ResultBanner from "@/components/ResultBanner.vue";

const playerId = ref("");
const loading = ref(false);

const resultMessage = ref("");
const resultType = ref("");

async function submit() {
    const trimmed = playerId.value.trim();

    if (!trimmed) {
        resultMessage.value = "Please enter a Player ID.";
        resultType.value = "error";
        return;
    }

    const confirmed = window.confirm(
        "Delete all Cloud Save data for this player?\n\n" +
        trimmed +
        "\n\nThis action may not be reversible."
    );

    if (!confirmed) {
        return;
    }

    loading.value = true;
    resultMessage.value = "";
    resultType.value = "";

    try {
        const json = await api.deletePlayerData(trimmed);

        resultMessage.value =
            json.message ||
            "Player Cloud Save data deleted successfully.";

        resultType.value = "success";
        playerId.value = "";
    } catch (error) {
        resultMessage.value = error.message;
        resultType.value = "error";
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <section id="delete-card" class="card">
        <h2>Delete Player Cloud Save</h2>

        <p>
            Enter a DuyAnhTod Authentication Player ID to delete
            the player's Cloud Save data.
        </p>

        <form @submit.prevent="submit">
            <label for="txtPlayerId">
                Player ID
            </label>

            <input
                id="txtPlayerId"
                v-model="playerId"
                name="playerId"
                type="text"
                placeholder="Enter  Player ID"
                autocomplete="off"
                required
            >

            <button
                class="delete-button"
                type="submit"
                :disabled="loading"
            >
                {{ loading ? "Deleting..." : "Delete Player Data" }}
            </button>
        </form>

        <div class="warning">
            This operation can permanently delete player Cloud
            Save data. Confirm the Player ID carefully.
        </div>

        <ResultBanner
            :message="resultMessage"
            :type="resultType"
        />
    </section>
</template>

<style scoped>
/* `.card` itself is styled by AdminView. */

.delete-button {
    background: #dc2626;
}

.delete-button:hover:not(:disabled) {
    background: #b91c1c;
}

.warning {
    margin-top: 20px;
    padding: 13px;
    border-radius: 8px;
    color: #92400e;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    font-size: 14px;
    line-height: 1.5;
}
</style>
