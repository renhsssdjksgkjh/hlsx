<template>
  <div class="page">
    <div class="page-head">
      <h2>用户信息</h2>
      <p class="desc">所有注册学员，支持编辑与删除</p>
    </div>
    <el-table v-loading="loading" :data="list" stripe border style="width: 100%">
      <el-table-column prop="id" label="ID" width="72" />
      <el-table-column prop="phone" label="手机号" min-width="120" />
      <el-table-column prop="nickname" label="昵称" min-width="120">
        <template #default="{ row }">{{ row.nickname || '—' }}</template>
      </el-table-column>
      <el-table-column prop="created_at" label="注册时间" min-width="170" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchUsers, updateUser, deleteUser, type AdminUser } from '@/api/http'

const loading = ref(false)
const list = ref<AdminUser[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({
  phone: '',
  nickname: '',
  password: '',
})

async function load() {
  loading.value = true
  try {
    list.value = await fetchUsers()
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
</style>
