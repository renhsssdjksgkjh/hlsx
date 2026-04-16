<template>
  <div class="page">
    <div class="page-head">
      <h2>视频列表</h2>
      <p class="desc">课程视频信息，支持编辑、删除与查看题库</p>
    </div>
    <div class="filters">
      <el-input
        v-model="keyword"
        clearable
        placeholder="搜索标题或 URL"
        style="max-width: 320px"
        @clear="onSearch"
        @keyup.enter="onSearch"
      />
      <el-button type="primary" @click="onSearch">搜索</el-button>
    </div>
    <el-table v-loading="loading" :data="list" stripe border style="width: 100%">
      <el-table-column type="index" label="序号" width="64" :index="indexMethod" />
      <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
      <el-table-column label="地址" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <a
            v-if="safeVideoHref(row.url)"
            :href="safeVideoHref(row.url)!"
            class="url-link"
            target="_blank"
            rel="noopener noreferrer"
          >{{ row.url }}</a>
          <span v-else class="url-plain">{{ row.url?.trim() ? row.url : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="duration_sec" label="时长(秒)" width="100">
        <template #default="{ row }">{{ row.duration_sec ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button type="success" link @click="openQuestions(row)">题库</el-button>
          <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pager">
      <ListPagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        @current-change="load"
        @size-change="onSizeChange"
      />
    </div>

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

    <el-dialog
      v-model="questionsVisible"
      :title="`题库 — ${questionsTitle}`"
      width="min(800px, 96vw)"
      destroy-on-close
      @closed="questionsList = []"
    >
      <el-table v-loading="questionsLoading" :data="questionsList" stripe border size="small" max-height="420">
        <el-table-column prop="id" label="ID" width="64" />
        <el-table-column prop="type" label="类型" width="88" />
        <el-table-column prop="content" label="题干" min-width="160" show-overflow-tooltip />
        <el-table-column label="选项/答案" min-width="200">
          <template #default="{ row }">
            <pre class="json-preview">{{ formatJson(row.options) }}</pre>
          </template>
        </el-table-column>
        <el-table-column label="正确答案" width="120">
          <template #default="{ row }">
            <span class="mono">{{ formatJson(row.correct_answer) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="72" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ListPagination from '@/components/ListPagination.vue'
import {
  fetchVideos,
  updateVideo,
  deleteVideo,
  fetchVideoQuestions,
  type AdminVideo,
  type AdminQuestion,
} from '@/api/http'

const loading = ref(false)
const list = ref<AdminVideo[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')

const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  title: '',
  url: '',
  sort_order: 0,
  duration_sec: null as number | null,
})

const questionsVisible = ref(false)
const questionsLoading = ref(false)
const questionsTitle = ref('')
const questionsList = ref<AdminQuestion[]>([])

function indexMethod(i: number) {
  return (page.value - 1) * pageSize.value + i + 1
}

/** 仅允许 http(s)，避免 javascript: 等协议 */
function safeVideoHref(url: string | null | undefined): string | null {
  const u = String(url ?? '').trim()
  if (!u) return null
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return u
  } catch {
    return null
  }
}

function formatJson(v: unknown) {
  try {
    return JSON.stringify(v, null, 0)
  } catch {
    return String(v)
  }
}

async function load() {
  loading.value = true
  try {
    const data = await fetchVideos({
      page: page.value,
      pageSize: pageSize.value,
      q: keyword.value.trim() || undefined,
    })
    list.value = data.list
    total.value = data.total
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

function onSearch() {
  page.value = 1
  load()
}

function onSizeChange() {
  page.value = 1
  load()
}

async function openQuestions(row: AdminVideo) {
  questionsTitle.value = row.title
  questionsVisible.value = true
  questionsLoading.value = true
  questionsList.value = []
  try {
    questionsList.value = await fetchVideoQuestions(row.id)
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '加载题库失败'
    ElMessage.error(msg)
  } finally {
    questionsLoading.value = false
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

<style scoped>
.page-head {
  margin-bottom: 1.25rem;
}
.page-head h2 {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
  color: #1a1d2e;
}
.desc {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}
.filters {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.tip {
  margin-left: 0.5rem;
  font-size: 12px;
  color: #6b7280;
}
.pager {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
.json-preview {
  margin: 0;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 4.5rem;
  overflow: hidden;
}
.mono {
  font-size: 12px;
  word-break: break-all;
}
.url-link {
  color: var(--el-color-primary);
  text-decoration: none;
  word-break: break-all;
}
.url-link:hover {
  text-decoration: underline;
}
.url-plain {
  color: #6b7280;
  word-break: break-all;
}
</style>
