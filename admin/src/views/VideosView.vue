<template>
  <div class="page">
    <div class="page-head">
      <h2>视频列表</h2>
      <p class="desc">课程视频信息，支持编辑与删除</p>
    </div>
    <el-table v-loading="loading" :data="list" stripe border style="width: 100%">
      <el-table-column prop="id" label="ID" width="64" />
      <el-table-column prop="sort_order" label="排序" width="72" />
      <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
      <el-table-column prop="url" label="地址" min-width="200" show-overflow-tooltip />
      <el-table-column prop="duration_sec" label="时长(秒)" width="100">
        <template #default="{ row }">{{ row.duration_sec ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="编辑视频" width="560px" @closed="resetForm">
      <el-form label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="255" />
        </el-form-item>
        <el-form-item label="视频 URL">
          <el-input v-model="form.url" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="时长(秒)">
          <el-input-number v-model="form.duration_sec" :min="0" :max="86400" placeholder="可空" />
          <span class="tip">留空表示未设置</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchVideos, updateVideo, deleteVideo, type AdminVideo } from '@/api/http'

const loading = ref(false)
const list = ref<AdminVideo[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  title: '',
  url: '',
  sort_order: 0,
  duration_sec: null as number | null,
})

async function load() {
  loading.value = true
  try {
    list.value = await fetchVideos()
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '加载失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function openEdit(row: AdminVideo) {
  editingId.value = row.id
  form.title = row.title
  form.url = row.url
  form.sort_order = row.sort_order
  form.duration_sec = row.duration_sec
  dialogVisible.value = true
}

function resetForm() {
  editingId.value = null
  form.title = ''
  form.url = ''
  form.sort_order = 0
  form.duration_sec = null
}

async function save() {
  if (!editingId.value) return
  saving.value = true
  try {
    await updateVideo(editingId.value, {
      title: form.title.trim(),
      url: form.url.trim(),
      sort_order: form.sort_order,
      duration_sec: form.duration_sec === null || form.duration_sec === undefined ? null : form.duration_sec,
    })
    ElMessage.success('已保存')
    dialogVisible.value = false
    await load()
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

async function onDelete(row: AdminVideo) {
  try {
    await ElMessageBox.confirm(
      `确定删除视频「${row.title}」？关联题目、进度与测验记录将一并删除。`,
      '危险操作',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      }
    )
    await deleteVideo(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    if (e !== 'cancel') {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : '删除失败'
      ElMessage.error(msg)
    }
  }
}

onMounted(load)
</script>
