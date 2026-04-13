import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/views/LayoutView.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/users' },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
        },
        {
          path: 'videos',
          name: 'videos',
          component: () => import('@/views/VideosView.vue'),
        },
        {
          path: 'password',
          name: 'password',
          component: () => import('@/views/PasswordView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isLoggedIn && to.name === 'login') {
      next({ name: 'users' })
      return
    }
    next()
    return
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }
  next()
})

export default router
