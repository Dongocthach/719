<script setup>
/**
 * Top navigation for the admin page.
 *
 * The in-page links target hashes; vue-router's scrollBehavior handles the
 * scrolling, so they behave like the original anchor tags did.
 */
</script>

<template>
    <nav class="app-nav">
        <div class="logo">
            DuyAnhTod Cloud Code Admin
        </div>

        <div class="nav-links">
            <router-link :to="{ name: 'admin', hash: '#home' }">
                Home
            </router-link>

            <router-link :to="{ name: 'admin', hash: '#tools' }">
                Tools
            </router-link>

            <router-link :to="{ name: 'admin', hash: '#say-hello-card' }">
                Say Hello
            </router-link>

            <router-link :to="{ name: 'admin', hash: '#delete-card' }">
                Delete Data
            </router-link>

            <router-link :to="{ name: 'chat' }">
                AI Chat
            </router-link>
        </div>
    </nav>
</template>

<style scoped>
.app-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 8%;
    background: #111827;
    color: white;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.logo {
    font-size: 20px;
    font-weight: bold;
}

.nav-links {
    display: flex;
    gap: 20px;
}

.nav-links a {
    color: white;
    text-decoration: none;
    font-size: 15px;
}

.nav-links a:hover {
    text-decoration: underline;
}

@media (max-width: 650px) {
    .app-nav {
        align-items: flex-start;
        flex-direction: column;
        gap: 12px;
    }

    .nav-links {
        flex-wrap: wrap;
        gap: 13px;
    }
}
</style>
