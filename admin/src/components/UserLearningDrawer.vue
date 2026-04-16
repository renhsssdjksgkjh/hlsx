<template>
  <el-drawer
    :model-value="modelValue"
    :title="drawerTitle"
    size="min(920px, 96vw)"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-tabs v-model="tab" @tab-change="onTabChange">
      <el-tab-pane label="课程进度与最近测验" name="learning">
        <div class="toolbar">
          <el-button type="primary" plain :disabled="!learning?.videos.length" @click="exportLearningCsv">
            导出 CSV
          </el-button>
        </div>
        <el-table v-loading="loadingLearning" :data="learning?.videos ?? []" stripe border size="small">
          <el-table-column prop="title" label="课程" min-width="140" show-overflow-tooltip />
          <el-table-column label="播放进度" width="200">
            <template #default="{ row }">
              <span v-if="row.progress_percent != null">{{ row.progress_percent }}%</span>
              <span v-else class="muted">—</span>
              <span class="muted">（{{ row.position_sec }}s</span>
              <span v-if="row.duration_sec != null" class="muted"> / {{ row.duration_sec }}s）</span>
              <span v-else class="muted">）</span>
            </template>
          </el-table-column>
          <el-table-column label="已看完" width="88" align="center">
            <template #default="{ row }">
              <el-tag :type="row.finished_watching ? 'success' : 'info'" size="small">
                {{ row.finished_watching ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近测验" min-width="160">
            <template #default="{ row }">
              <template v-if="row.latest_quiz">
                {{ row.latest_quiz.score }}/{{ row.latest_quiz.total }}
                <span v-if="row.latest_quiz.accuracy != null" class="muted">
                  （{{ (row.latest_quiz.accuracy * 100).toFixed(0) }}%）
                </span>
                <div class="muted small">{{ formatChinaDateTime(row.latest_quiz.created_at) }}</div>
              </template>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="测验提交历史" name="quiz">
        <el-table v-loading="loadingQuiz" :data="quizList" stripe border size="small">
          <el-table-column prop="video_title" label="课程" min-width="120" show-overflow-tooltip />
          <el-table-column label="得分" width="100" align="center">
            <template #default="{ row }">
              {{ row.score }}/{{ row.total }}
            </template>
          </el-table-column>
          <el-table-column label="正确率" width="88" align="center">
            <template #default="{ row }">
              <span v-if="row.accuracy != null">{{ (row.accuracy * 100).toFixed(0) }}%</span>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" min-width="170">
            <template #default="{ row }">{{ formatChinaDateTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
        <div class="pager">
          <ListPagination
            v-model:current-page="quizPage"
            v-model:page-size="quizPageSize"
            :total="quizTotal"
            small
            @current-change="loadQuiz"
            @size-change="onQuizPageSizeChange"
          />
        </div>
        <div class="toolbar quiz-export">
          <el-button type="primary" plain :disabled="!quizTotal" @click="exportQuizCsv">导出测验历史 CSV</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  fetchUserLearning,
  fetchUserQuizRecords,
  type UserLearningData,
  type QuizRecordRow,
} from '@/api/http'
import { downloadCsv } from '@/utils/csv'
import ListPagination from '@/components/ListPagination.vue'
import { formatChinaDateTime } from '@/utils/datetime'

const props = defineProps<{
  modelValue: boolean
  userId: number | null
  phone: string
  /** 抽屉标题展示用；空则显示「—」 */
  nickname: string | null
}>()

const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const drawerTitle = computed(() => {
  const n = props.nickname?.trim()
  return `学情 — ${n ? n : '—'}`
})

const tab = ref('learning')
const loadingLearning = ref(false)
const loadingQuiz = ref(false)
const learning = ref<UserLearningData | null>(null)

const quizList = ref<QuizRecordRow[]>([])
const quizTotal = ref(0)
const quizPage = ref(1)
const quizPageSize = ref(10)

function onQuizPageSizeChange() {
  quizPage.value = 1
  loadQuiz()
}

async function loadLearning() {
  if (props.userId == null) return
  loadingLearning.value = true
  try {
    learning.value = await fetchUserLearning(props.userId)
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '加载学情失败'
    ElMessage.error(msg)
    learning.value = { videos: [] }
  } finally {
    loadingLearning.value = false
  }
}

async function loadQuiz() {
  if (props.userId == null) return
  loadingQuiz.value = true
  try {
    const offset = (quizPage.value - 1) * quizPageSize.value
    const data = await fetchUserQuizRecords(props.userId, {
      limit: quizPageSize.value,
      offset,
    })
    quizList.value = data.list
    quizTotal.value = data.total
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '加载测验记录失败'
    ElMessage.error(msg)
    quizList.value = []
    quizTotal.value = 0
  } finally {
    loadingQuiz.value = false
  }
}

function onTabChange(name: string | number) {
  if (name === 'quiz' && props.userId != null) {
    quizPage.value = 1
    loadQuiz()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.userId != null) {
      tab.value = 'learning'
      learning.value = null
      quizList.value = []
      quizTotal.value = 0
      quizPage.value = 1
      loadLearning()
    }
  }
)

/** 导出 CSV 文件名片段：优先昵称，去除 Windows 非法字符；无昵称则用手机号 */
function safeCsvFileLabel(): string {
  const n = props.nickname?.trim()
  if (n) {
    const s = n.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim()
    if (s) return s.slice(0, 80)
  }
  const p = props.phone?.trim()
  return p || 'user'
}

function exportLearningCsv() {
  const v = learning.value?.videos
  if (!v?.length) {
    ElMessage.warning('暂无数据')
    return
  }
  const headers = [
    '课程',
    '进度秒',
    '时长秒',
    '进度百分比',
    '已看完',
    '最近得分',
    '最近总分',
    '最近正确率',
    '最近测验时间',
  ]
  const rows = v.map((r) => [
    r.title,
    r.position_sec,
    r.duration_sec ?? '',
    r.progress_percent ?? '',
    r.finished_watching ? '是' : '否',
    r.latest_quiz?.score ?? '',
    r.latest_quiz?.total ?? '',
    r.latest_quiz?.accuracy != null ? `${(r.latest_quiz.accuracy * 100).toFixed(1)}%` : '',
    r.latest_quiz ? formatChinaDateTime(r.latest_quiz.created_at) : '',
  ])
  downloadCsv(`学情_${safeCsvFileLabel()}_${Date.now()}.csv`, headers, rows)
  ElMessage.success('已导出')
}

async function exportQuizCsv() {
  if (props.userId == null || !quizTotal.value) {
    ElMessage.warning('暂无数据')
    return
  }
  loadingQuiz.value = true
  try {
    const data = await fetchUserQuizRecords(props.userId, { limit: 500, offset: 0 })
    const headers = ['课程', '得分', '总分', '正确率', '提交时间']
    const rows = data.list.map((r) => [
      r.video_title,
      r.score,
      r.total,
      r.accuracy != null ? `${(r.accuracy * 100).toFixed(1)}%` : '',
      formatChinaDateTime(r.created_at),
    ])
    downloadCsv(`测验历史_${safeCsvFileLabel()}_${Date.now()}.csv`, headers, rows)
    ElMessage.success(`已导出 ${data.list.length} 条（最多 500 条）`)
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '导出失败'
    ElMessage.error(msg)
  } finally {
    loadingQuiz.value = false
  }
}
</script>

<style scoped>
.toolbar {
  margin-bottom: 0.75rem;
}
.quiz-export {
  margin-top: 0.75rem;
}
.pager {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
}
.muted {
  color: #6b7280;
}
.small {
  font-size: 12px;
}
</style>
