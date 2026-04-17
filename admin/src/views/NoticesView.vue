<template>
  <div class="page">
    <div class="page-head">
      <h2>群公告管理</h2>
      <p class="desc">向全体或指定学员发布公告；未发布为草稿</p>
    </div>
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新建公告</el-button>
    </div>
    <el-table v-loading="loading" :data="list" stripe border style="width: 100%">
      <el-table-column type="index" label="序号" width="64" :index="indexMethod" />
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column label="目标" width="100">
        <template #default="{ row }">
          {{ row.target_type === 'all' ? '全体' : '指定用户' }}
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="170">
        <template #default="{ row }">{{ formatChinaDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="发布时间" min-width="170">
        <template #default="{ row }">{{
          row.published_at ? formatChinaDateTime(row.published_at) : '—（草稿）'
        }}</template>
      </el-table-column>
      <el-table-column prop="admin_username" label="发布人" width="120" />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
          <el-button
            v-if="!row.published_at"
            type="success"
            link
            @click="onPublish(row)"
          >
            发布
          </el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑公告' : '新建公告'"
      width="560px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form label-width="96px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="公告标题" />
        </el-form-item>
        <el-form-item label="正文" required>
          <el-input
            v-model="form.body"
            type="textarea"
            :rows="8"
            maxlength="20000"
            show-word-limit
            placeholder="公告正文"
          />
        </el-form-item>
        <el-form-item label="发送范围">
          <el-radio-group v-model="form.target_type">
            <el-radio value="all">全体学员</el-radio>
            <el-radio value="selected">指定学员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.target_type === 'selected'" label="选择学员">
          <el-select
            v-model="form.user_ids"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="搜索并选择手机号/昵称"
            style="width: 100%"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="`${u.phone} ${u.nickname || ''}`.trim()"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-checkbox v-model="form.publish">保存并发布（取消则存为草稿）</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchNotices,
  fetchNotice,
  createNotice,
  updateNotice,
  deleteNotice,
  publishNotice,
  fetchUsers,
  type AdminNoticeRow,
  type AdminUser,
} from '@/api/http'
import { formatChinaDateTime } from '@/utils/datetime'
import ListPagination from '@/components/ListPagination.vue'

const loading = ref(false)
const list = ref<AdminNoticeRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  title: '',
  body: '',
  target_type: 'all' as 'all' | 'selected',
  user_ids: [] as number[],
  publish: true,
})

const userOptions = ref<AdminUser[]>([])

function indexMethod(i: number) {
  return (page.value - 1) * pageSize.value + i + 1
}

async function loadUserOptions() {
  const data = await fetchUsers({ page: 1, pageSize: 500 })
  userOptions.value = data.list
}

async function load() {
  loading.value = true
  try {
    const data = await fetchNotices({ page: page.value, pageSize: pageSize.value })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function onSizeChange() {
  page.value = 1
  load()
}

function resetForm() {
  editingId.value = null
  form.title = ''
  form.body = ''
  form.target_type = 'all'
  form.user_ids = []
  form.publish = true
}

function openCreate() {
  resetForm()
  editingId.value = null
  dialogVisible.value = true
}

async function openEdit(row: AdminNoticeRow) {
  resetForm()
  editingId.value = row.id
  const detail = await fetchNotice(row.id)
  form.title = detail.title
  form.body = detail.body
  form.target_type = detail.target_type
  form.user_ids = detail.user_ids || []
  form.publish = !!detail.published_at
  dialogVisible.value = true
}

async function save() {
  const title = form.title.trim()
  const body = form.body.trim()
  if (!title || !body) {
    ElMessage.warning('请填写标题与正文')
    return
  }
  if (form.target_type === 'selected' && form.user_ids.length === 0) {
    ElMessage.warning('指定学员时请至少选择一人')
    return
  }
  saving.value = true
  try {
    const payload = {
      title,
      body,
      target_type: form.target_type,
      user_ids: form.target_type === 'selected' ? form.user_ids : undefined,
      publish: form.publish,
    }
    if (editingId.value) {
      await updateNotice(editingId.value, payload)
      ElMessage.success('已保存')
    } else {
      await createNotice(payload)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    await load()
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

async function onPublish(row: AdminNoticeRow) {
  try {
    await ElMessageBox.confirm(`确定发布「${row.title}」？`, '发布', { type: 'warning' })
    await publishNotice(row.id)
    ElMessage.success('已发布')
    await load()
  } catch {
    /* cancel */
  }
}

async function onDelete(row: AdminNoticeRow) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？`, '删除', { type: 'warning' })
    await deleteNotice(row.id)
    ElMessage.success('已删除')
    await load()
  } catch {
    /* cancel */
  }
}

onMounted(async () => {
  await loadUserOptions()
  await load()
})
</script>

<style scoped>
.page-head {
  margin-bottom: 16px;
}
.page-head h2 {
  margin: 0 0 8px;
  font-size: 20px;
}
.desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}
.toolbar {
  margin-bottom: 12px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
