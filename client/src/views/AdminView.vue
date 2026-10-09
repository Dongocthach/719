<script setup>
import AdminKeyPanel from "@/components/AdminKeyPanel.vue";
import AppNav from "@/components/AppNav.vue";
import DeletePlayerCard from "@/components/DeletePlayerCard.vue";
import SayHelloCard from "@/components/SayHelloCard.vue";
</script>

<template>
    <div class="admin-page">
        <AppNav />

        <header id="home" class="hero">
            <div class="hero-content">
                <div class="hero-text">
                    <h1>DuyAnhTod</h1>

                    <p>Official Admin Website</p>

                    <a
                        href="https://play.google.com/store/apps/details?id=com.thachstudio.dirottod"
                        target="_blank"
                        rel="noopener"
                        class="hero-button"
                    >
                        Try on Play Store
                    </a>
                </div>

                <!--
                    images/1.png is only 416x610 (portrait). Used as a
                    full-bleed background it would be cropped to a sliver and
                    upscaled ~4.6x on a desktop. It is laid out at its native
                    size instead, so it stays sharp on every screen.
                -->
                <img
                    class="hero-art"
                    src="/1.png"
                    alt="DuyAnhTod"
                    width="416"
                    height="610"
                    decoding="async"
                    fetchpriority="high"
                >
            </div>
        </header>

        <main id="tools" class="section">
            <h2 class="section-title">
                Cloud Code Tools
            </h2>

            <p class="section-description">
                Use the greeting tool to test your Cloud Code connection.
                Use the player-data tool only for authorized administrative
                operations.
            </p>

            <AdminKeyPanel />

            <div class="card-container">
                <SayHelloCard />
                <DeletePlayerCard />
            </div>
        </main>

        <footer>
            DuyAnhTod - Cloud Website Module
        </footer>
    </div>
</template>

<style scoped>
.hero {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 72px 8%;
    color: white;
    background: linear-gradient(135deg, #014a75, #e098a7);
}

/* Desktop / laptop: text on the left, poster on the right. */
.hero-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: clamp(32px, 5vw, 72px);
    width: 100%;
    max-width: 1120px;
}

.hero-text {
    flex: 1 1 auto;
    min-width: 0;
    text-align: left;
}

.hero h1 {
    margin: 0 0 18px;
    font-size: clamp(38px, 5vw, 64px);
    line-height: 1.05;
}

.hero p {
    margin: 0 0 30px;
    max-width: 46ch;
    font-size: 19px;
    line-height: 1.7;
    color: #dbeafe;
}

/*
 * flex-basis equals the source width and max-width caps it, so the poster is
 * never upscaled past its 416px original; flex-shrink lets it give way on
 * narrow viewports instead of forcing a horizontal scrollbar.
 */
.hero-art {
    flex: 1 1 416px;
    min-width: 0;
    width: 100%;
    max-width: 416px;
    height: auto;
    border-radius: 20px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
    outline: 1px solid rgba(255, 255, 255, 0.18);
    outline-offset: -1px;
}

.hero-button {
    display: inline-block;
    padding: 14px 28px;
    border-radius: 9px;
    color: white;
    background: #2563eb;
    text-decoration: none;
    font-size: 17px;
    font-weight: bold;
    transition: transform 0.2s, background 0.2s;
}

.hero-button:hover {
    background: #1d4ed8;
    transform: translateY(-2px);
}

/*
 * Below 900px there is no longer room for text and a 416px poster side by
 * side, so stack them. `flex: none` is essential here: the base rule's
 * flex-basis would otherwise become a *height* in column direction.
 */
@media (max-width: 900px) {
    .hero {
        padding: 56px 24px;
    }

    .hero-content {
        flex-direction: column;
        text-align: center;
        gap: 36px;
    }

    .hero-text {
        text-align: center;
    }

    .hero p {
        margin-left: auto;
        margin-right: auto;
    }

    .hero-art {
        flex: none;
        width: 100%;
        max-width: 340px;
    }
}

@media (max-width: 480px) {
    .hero {
        padding: 44px 20px;
    }

    .hero-art {
        max-width: 260px;
    }
}

.section {
    padding: 75px 20px;
}

.section-title {
    margin: 0 0 12px;
    text-align: center;
    font-size: 34px;
}

.section-description {
    max-width: 680px;
    margin: 0 auto 40px;
    text-align: center;
    line-height: 1.6;
    color: #5f6368;
}

.card-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 25px;
    max-width: 1000px;
    margin: auto;
}

/* These rules reach the child components because a scoped style still
   applies to their root element. */
.card-container :deep(.card) {
    padding: 28px;
    border-radius: 16px;
    background: white;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.09);
}

.card-container :deep(.card h2) {
    margin-top: 0;
    margin-bottom: 10px;
}

.card-container :deep(.card p) {
    color: #5f6368;
    line-height: 1.5;
}

footer {
    padding: 28px 20px;
    text-align: center;
    color: #cbd5e1;
    background: #111827;
}
</style>
