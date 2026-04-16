<template>
  <div class="page">
    <div class="page-head">
      <h2>用户信息</h2>
      <p class="desc">所有注册学员，支持编辑、删除与查看学情</p>
    </div>
    <div class="filters">
      <el-input
        v-model="keyword"
        clearable
        placeholder="搜索手机号或昵称"
        style="max-width: 280px"
        @clear="onSearch"
        @keyup.enter="onSearch"
      />
      <el-button type="primary" @click="onSearch">搜索</el-button>
    </div>
    <el-table v-loading="loading" :data="list" stripe border style="width: 100%">
      <el-table-column type="index" label="序号" width="64" :index="indexMethod" />
      <el-table-column prop="phone" label="手机号" min-width="120" />
      <el-table-column prop="nickname" label="昵称" min-width="120">
        <template #default="{ row }">{{ row.nickname || '—' }}</template>
      </el-table-column>
      <el-table-column label="注册时间" min-width="170">
        <template #default="{ row }">{{ formatChinaDateTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button type="success" link @click="openLearning(row)">学情</el-button>
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

    <el-dialog v-model="dialogVisible" title="编辑用户" width="480px" @closed="resetForm">
      <el-form label-width="88px">
        <el-form-item label="手机号">
          <el-input v-model="form.phone" maxlength="20" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" maxlength="64" placeholder="可留空" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="不修改请留空"
            autocomplete="new-password"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <UserLearningDrawer
      v-model="learningOpen"
      :user-id="learningUserId"
      :phone="learningPhone"
      :nickname="learningNickname"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchUsers, updateUser, deleteUser, type AdminUser } from '@/api/http'
import { formatChinaDateTime } from '@/utils/datetime'
import ListPagination from '@/components/ListPagination.vue'
import UserLearningDrawer from '@/components/UserLearningDrawer.vue'

const loading = ref(false)
const list = ref<AdminUser[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')

const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  phone: '',
  nickname: '',
  password: '',
})

const learningOpen = ref(false)
const learningUserId = ref<number | null>(null)
const learningPhone = ref('')
const learningNickname = ref<string | null>(null)

function indexMethod(i: number) {
  return (page.value - 1) * pageSize.value + i + 1
}

async function load() {
  loading.value = true
  try {
    const data = await fetchUsers({
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

function openLearning(row: AdminUser) {
  learningUserId.value = row.id
  learningPhone.value = row.phone
  learningNickname.value = row.nickname
  learningOpen.value = true
}

function openEdit(row: AdminUser) {
  editingId.value = row.id
  form.phone = row.phone
  form.nickname = row.nickname || ''
  form.password = ''
  dialogVisible.value = true
}

function resetForm() {
  editingId.value = null
  form.phone = ''
  form.nickname = ''
  form.password = ''
}

async function save() {
  if (!editingId.value) return
  saving.value = true
  try {
    const body: { phone: string; nickname: string | null; password?: string } = {
      phone: form.phone.trim(),
      nickname: form.nickname.trim() || null, 
    }
    if (form.password.trim()) body.password = form.password.trim()
    await updateUser(editingId.value, body)
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

async function onDelete(row: AdminUser) {
  try {
    await ElMessageBox.confirm(`确定删除用户 ${row.phone}？相关学习进度与测验记录将一并删除。`, '危险操作', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteUser(row.id)
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
.pager {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
</style>
