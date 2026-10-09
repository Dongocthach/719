<script setup>
import { ref } from "vue";

import { api, extractCloudCodeResult } from "@/api";
import ResultBanner from "@/components/ResultBanner.vue";

const name = ref("");
const loading = ref(false);

const resultMessage = ref("");
const resultType = ref("");

async function submit() {
    const trimmed = name.value.trim();

    if (!trimmed) {
        resultMessage.value = "Please enter a name.";
        resultType.value = "error";
        return;
    }

    loading.value = true;
    resultMessage.value = "";
    resultType.value = "";

    try {
        const json = await api.sayHello(trimmed);

        resultMessage.value = extractCloudCodeResult(json.result);
        resultType.value = "success";
    } catch (error) {
        resultMessage.value = error.message;
        resultType.value = "error";
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <section id="say-hello-card" class="card">
        <h2>Say Hello</h2>

        <p>
            Enter a name and call the
            <strong>SayHello</strong> Cloud Code function.
        </p>

        <form @submit.prevent="submit">
            <label for="txtName">
                Name
            </label>

            <input
                id="txtName"
                v-model="name"
                name="name"
                type="text"
                maxlength="50"
                placeholder="Enter your name"
                autocomplete="name"
                required
            >

            <button type="submit" :disabled="loading">
                {{ loading ? "Loading..." : "Say Hello" }}
            </button>
        </form>

        <ResultBanner
            :message="resultMessage"
            :type="resultType"
        />
    </section>
</template>

<!-- `.card` is styled by AdminView, which owns the grid this sits in. -->

