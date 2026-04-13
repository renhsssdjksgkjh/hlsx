<template>
  <div class="page">
    <div class="page-head">
      <h2>修改密码</h2>
      <p class="desc">修改当前管理员登录密码</p>
    </div>
    <el-card class="card" shadow="never">
      <el-form label-width="100px" style="max-width: 420px" @submit.prevent="onSubmit">
        <el-form-item label="当前密码">
          <el-input
            v-model="oldPassword"
            type="password"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="newPassword"
            type="password"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="confirmPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit">保存新密码</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminChangePassword } from '@/api/http'

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

async function onSubmit() {
  if (!oldPassword.value || !newPassword.value) {
    ElMessage.warning('请填写完整')
    return
  }
  if (newPassword.value.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  loading.value = true
  try {
    await adminChangePassword(oldPassword.value, newPassword.value)
    ElMessage.success('密码已更新，请使用新密码重新登录')
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '修改失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
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
.card {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}
</style>
