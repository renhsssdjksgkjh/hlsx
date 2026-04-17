<template>
  <!-- 微信小程序：原生 TabBar 与页面不在同一渲染层，普通 view 的 fixed+z-index 会被挡住，需用 cover-view -->
  <!-- #ifdef MP-WEIXIN -->
  <cover-view v-if="show" class="fab-mp" @tap.stop="emitBack">
    <cover-view class="fab-mp__tri" :style="triStyle" />
  </cover-view>
  <!-- #endif -->
  <!-- #ifndef MP-WEIXIN -->
  <view
    v-if="show"
    class="back-top-fab"
    hover-class="back-top-fab--hover"
    @tap.stop="emitBack"
    @click.stop="emitBack"
  >
    <u-icon name="arrow-up" :size="iconSize" :color="iconColor" />
  </view>
  <!-- #endif -->
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    iconSize?: number
    iconColor?: string
  }>(),
  { iconSize: 22, iconColor: '#ff7000' }
)

/** 小程序：三角颜色随 iconColor；尺寸与 iconSize 大致成比例（rpx） */
const triStyle = computed(() => {
  const n = Math.min(40, Math.max(16, Number(props.iconSize) || 22))
  const half = `${Math.round(n * 0.72)}rpx`
  const base = `${Math.round(n * 1.05)}rpx`
  return {
    marginLeft: `-${half}`,
    marginTop: `-${Math.round(n * 0.55)}rpx`,
    borderLeftWidth: half,
    borderRightWidth: half,
    borderBottomWidth: base,
    borderBottomColor: props.iconColor,
  }
})

const emit = defineEmits<{ back: [] }>()

function emitBack() {
  emit('back')
}
</script>

<style scoped lang="scss">
/* 与原生 TabBar 错开：约 48px 栏 + 留白，避免视觉上被挡在底栏后面 */
$fab-bottom-offset: calc(180rpx + constant(safe-area-inset-bottom));
$fab-bottom-offset-env: calc(180rpx + env(safe-area-inset-bottom, 0px));

/* #ifdef MP-WEIXIN */
.fab-mp {
  position: fixed;
  right: 28rpx;
  bottom: $fab-bottom-offset;
  bottom: $fab-bottom-offset-env;
  z-index: 99999;
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background-color: #ffffff;
  border: 1px solid rgba(255, 112, 0, 0.2);
  box-sizing: border-box;
  overflow: hidden;
}

/* 透明左右边框 + 实心底边 = 朝上三角 */
.fab-mp__tri {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  border-style: solid;
  border-left-color: transparent;
  border-right-color: transparent;
  border-top: none;
}
/* #endif */

/* #ifndef MP-WEIXIN */
.back-top-fab {
  position: fixed;
  right: 28rpx;
  bottom: $fab-bottom-offset;
  bottom: $fab-bottom-offset-env;
  z-index: 99999;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 8rpx 28rpx rgba(255, 112, 0, 0.22);
  border: 1px solid rgba(255, 112, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  pointer-events: auto;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.back-top-fab--hover {
  opacity: 0.88;
  transform: scale(0.96);
}
/* #endif */
</style>
