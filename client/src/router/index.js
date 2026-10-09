import { createRouter, createWebHistory } from "vue-router";

import AdminView from "@/views/AdminView.vue";

const router = createRouter({
    history: createWebHistory(),

    // Handles both real page navigations and the in-page #anchor links used
    // by the admin page navigation.
    scrollBehavior(to, from, savedPosition) {
        if (to.hash) {
            return {
                el: to.hash,
                top: 90,
                behavior: "smooth"
            };
        }

        if (savedPosition) {
            return savedPosition;
        }

        return { top: 0 };
    },

    routes: [
        {
            path: "/",
            name: "admin",
            component: AdminView,
            meta: { title: "DuyAnhTod Cloud Code Admin" }
        },
        {
            // Lazily loaded so the chat bundle is not paid for on the
            // admin page.
            path: "/chat",
            name: "chat",
            component: () => import("@/views/ChatView.vue"),
            meta: { title: "AI Chat" }
        },
        {
            path: "/:pathMatch(.*)*",
            redirect: { name: "admin" }
        }
    ]
});

router.afterEach((to) => {
    document.title =
        (to.meta && to.meta.title) || "DuyAnhTod Cloud Code Admin";
});

export default router;
