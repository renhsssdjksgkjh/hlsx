<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

onLaunch(() => {
  const t = uni.getStorageSync('token') as string
  if (t) {
    useUserStore().setToken(t)
  }
})
</script>

<style lang="scss">
@import 'uview-plus/index.scss';
</style>
