import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Express API routes that the Vite dev server must forward to the backend.
const API_ROUTES = [
    "/say-hello",
    "/DeletePlayerDataByPlayerId",
    "/ai",
    "/chat-logs"
];

const API_TARGET = process.env.API_TARGET || "http://localhost:3000";

export default defineConfig({
    // The Vite project root is client/, but the production bundle is written
    // into ../public so the existing Express static handler keeps serving it.
    root: fileURLToPath(new URL(".", import.meta.url)),

    plugins: [vue()],

    base: "/",

    // Serve the repo's existing images/ folder as static assets, so
    // images/1.png is published as /1.png without being duplicated in git.
    publicDir: fileURLToPath(new URL("../images", import.meta.url)),

    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url))
        }
    },

    build: {
        outDir: fileURLToPath(new URL("../public", import.meta.url)),
        emptyOutDir: true,
        sourcemap: false
    },

    server: {
        port: 5173,
        strictPort: false,
        proxy: Object.fromEntries(
            API_ROUTES.map((route) => [
                route,
                {
                    target: API_TARGET,
                    changeOrigin: true
                }
            ])
        )
    }
});
