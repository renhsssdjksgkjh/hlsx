<template>
  <el-pagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    :total="total"
    :page-sizes="PAGE_SIZES"
    :layout="layout"
    :small="small"
    :background="background"
    @current-change="emit('current-change', $event)"
    @size-change="emit('size-change', $event)"
  />
</template>

<script setup lang="ts">
const PAGE_SIZES = [10, 20, 50] as const

const currentPage = defineModel<number>('currentPage', { required: true })
const pageSize = defineModel<number>('pageSize', { required: true })

withDefaults(
  defineProps<{
    total: number
    small?: boolean
    background?: boolean
    layout?: string
  }>(),
  {
    background: true,
    layout: 'total, sizes, prev, pager, next, jumper',
  }
)

const emit = defineEmits<{
  'current-change': [page: number]
  'size-change': [size: number]
}>()
</script>
