<template>
  <div class="page">
    <div class="page-head">
      <h2>概览</h2>
      <p class="desc">学员、课程与测验数据汇总</p>
    </div>
    <el-row v-loading="loading" :gutter="16">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-card--click" role="button" tabindex="0" @click="goUsers"
          @keyup.enter="goUsers">
          <div class="stat-label">注册学员</div>
          <div class="stat-value">{{ stats?.userCount ?? '—' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-card--click" role="button" tabindex="0" @click="goVideos"
          @keyup.enter="goVideos">
          <div class="stat-label">视频课程</div>
          <div class="stat-value">{{ stats?.videoCount ?? '—' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card
          shadow="hover"
          class="stat-card stat-card--click"
          role="button"
          tabindex="0"
          @click="openQuizRecordsDialog"
          @keyup.enter="openQuizRecordsDialog"
        >
          <div class="stat-label">测验提交次数</div>
          <div class="stat-value">{{ stats?.quizRecordCount ?? '—' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card stat-card--click" role="button" tabindex="0"
          @click="openQuestionsDialog" @keyup.enter="openQuestionsDialog">
          <div class="stat-label">题目总数</div>
          <div class="stat-value">{{ stats?.questionCount ?? '—' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="12">
        <el-card v-loading="loading" shadow="hover" class="chart-card">
          <template #header>
            <span class="chart-title">全部学员 · 平均得分率</span>
          </template>
          <div v-show="hasUserChartData" ref="userChartEl" class="chart-host"
            :style="{ height: `${userChartHeight}px` }" />
          <el-empty v-if="!loading && !hasUserChartData" description="暂无注册学员" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card v-loading="loading" shadow="hover" class="chart-card">
          <template #header>
            <span class="chart-title">全部课程 · 平均得分率</span>
          </template>
          <div v-show="hasVideoChartData" ref="videoChartEl" class="chart-host"
            :style="{ height: `${videoChartHeight}px` }" />
          <el-empty v-if="!loading && !hasVideoChartData" description="暂无视频课程" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="quizRecordsVisible"
      title="测验提交记录"
      width="min(920px, 96vw)"
      destroy-on-close
      @opened="onQuizRecordsDialogOpened"
    >
      <el-table v-loading="quizRecordsLoading" :data="quizRecordsList" stripe border max-height="520" size="small">
        <el-table-column prop="user_label" label="学员" min-width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="video_title" label="视频课程" min-width="160" show-overflow-tooltip />
        <el-table-column label="得分" width="100" align="center">
          <template #default="{ row }">{{ row.score }}/{{ row.total }}</template>
        </el-table-column>
        <el-table-column label="提交时间" min-width="170">
          <template #default="{ row }">{{ formatChinaDateTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>
      <div class="quiz-records-pager">
        <ListPagination
          v-model:current-page="quizPage"
          v-model:page-size="quizPageSize"
          :total="quizRecordsTotal"
          small
          @current-change="loadQuizRecords"
          @size-change="onQuizPageSizeChange"
        />
      </div>
    </el-dialog>

    <el-dialog v-model="questionsVisible" title="全部题目（仅题干）" width="min(720px, 94vw)" destroy-on-close
      @opened="onQuestionsDialogOpened">
      <el-table v-loading="questionsLoading" :data="questionsList" stripe border max-height="480" size="small">
        <el-table-column prop="video_title" label="所属课程" min-width="120" show-overflow-tooltip />
        <el-table-column prop="type" label="题型" width="88" />
        <el-table-column prop="content" label="题干" min-width="200" show-overflow-tooltip />
      </el-table>
      <div class="questions-preview-pager">
        <ListPagination
          v-model:current-page="questionsPage"
          v-model:page-size="questionsPageSize"
          :total="questionsTotal"
          small
          @current-change="loadQuestions"
          @size-change="onQuestionsPageSizeChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  fetchStats,
  fetchChartStats,
  fetchAllQuestionsPreview,
  fetchAllQuizRecords,
  type AdminStats,
  type AdminChartStats,
  type QuestionStemRow,
  type AdminQuizSubmissionRow,
} from '@/api/http'
import ListPagination from '@/components/ListPagination.vue'
import { formatChinaDateTime } from '@/utils/datetime'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const router = useRouter()

const loading = ref(false)
const stats = ref<AdminStats | null>(null)
const chartData = ref<AdminChartStats | null>(null)

const userChartEl = ref<HTMLDivElement | null>(null)
const videoChartEl = ref<HTMLDivElement | null>(null)
let userChart: echarts.ECharts | null = null
let videoChart: echarts.ECharts | null = null

const hasUserChartData = computed(
  () => (chartData.value?.userQuizAvg?.length ?? 0) > 0
)
const hasVideoChartData = computed(
  () => (chartData.value?.videoQuizAvg?.length ?? 0) > 0
)

/** 纵轴标签换行长度（中文按字计数），不截断、用换行完整展示 */
const AXIS_WRAP_CHARS = 10

/** 两图容器可不同高度，但坐标轴与提示框等文字字号统一 */
const CHART_FONT_VALUE = 12
const CHART_FONT_CATEGORY = 12

function wrapAxisLabelText(text: string, maxCharsPerLine: number) {
  const s = String(text ?? '')
  if (!s.length) return ''
  if (s.length <= maxCharsPerLine) return s
  const parts: string[] = []
  for (let i = 0; i < s.length; i += maxCharsPerLine) {
    parts.push(s.slice(i, i + maxCharsPerLine))
  }
  return parts.join('\n')
}

function maxWrapLinesForTexts(texts: string[], maxCharsPerLine: number) {
  if (!texts.length) return 1
  return Math.max(
    1,
    ...texts.map((t) => Math.ceil(String(t).length / maxCharsPerLine) || 1)
  )
}

function chartContainerHeight(labels: string[]): number {
  const n = labels.length
  if (n === 0) return 280
  const maxLines = maxWrapLinesForTexts(labels, AXIS_WRAP_CHARS)
  const rowH = Math.max(30, maxLines * 16 + 10)
  return Math.min(2000, Math.max(280, rowH * n + 120))
}

const userChartHeight = computed(() =>
  chartContainerHeight(chartData.value?.userQuizAvg?.map((r) => r.label) ?? [])
)

const videoChartHeight = computed(() =>
  chartContainerHeight(chartData.value?.videoQuizAvg?.map((r) => r.video_title) ?? [])
)

const questionsVisible = ref(false)
const questionsLoading = ref(false)
const questionsList = ref<QuestionStemRow[]>([])
const questionsTotal = ref(0)
const questionsPage = ref(1)
const questionsPageSize = ref(10)

const quizRecordsVisible = ref(false)
const quizRecordsLoading = ref(false)
const quizRecordsList = ref<AdminQuizSubmissionRow[]>([])
const quizRecordsTotal = ref(0)
const quizPage = ref(1)
const quizPageSize = ref(10)

function openQuizRecordsDialog() {
  quizRecordsVisible.value = true
}

function onQuizRecordsDialogOpened() {
  quizPage.value = 1
  loadQuizRecords()
}

function onQuizPageSizeChange() {
  quizPage.value = 1
  loadQuizRecords()
}

async function loadQuizRecords() {
  quizRecordsLoading.value = true
  try {
    const offset = (quizPage.value - 1) * quizPageSize.value
    const data = await fetchAllQuizRecords({
      limit: quizPageSize.value,
      offset,
    })
    quizRecordsList.value = data.list
    quizRecordsTotal.value = data.total
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '加载失败'
    ElMessage.error(msg)
    quizRecordsList.value = []
    quizRecordsTotal.value = 0
  } finally {
    quizRecordsLoading.value = false
  }
}

function onResize() {
  userChart?.resize()
  videoChart?.resize()
}

function disposeCharts() {
  userChart?.dispose()
  videoChart?.dispose()
  userChart = null
  videoChart = null
}

function buildUserOption() {
  const rows = chartData.value?.userQuizAvg ?? []
  const categories = rows.map((r) => r.label)
  const values = rows.map((r) => {
    if (!r.quizCount || r.avgAccuracy == null) return 0
    return Number((r.avgAccuracy * 100).toFixed(2))
  })
  const valFs = CHART_FONT_VALUE
  const catFs = CHART_FONT_CATEGORY
  const nameGap = Math.round(22 + valFs * 0.6)
  return {
    grid: { left: 0, right: 28, top: 16, bottom: Math.round(32 + valFs * 0.5), containLabel: true },
    textStyle: { fontSize: valFs },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      textStyle: { fontSize: valFs },
      formatter: (p: unknown) => {
        const arr = p as { dataIndex?: number }[]
        const i = arr[0]?.dataIndex ?? 0
        const r = rows[i]
        if (!r) return ''
        if (!r.quizCount || r.avgAccuracy == null) {
          return `${r.label}<br/>暂无测验记录`
        }
        const pct = (r.avgAccuracy * 100).toFixed(1)
        return `${r.label}<br/>平均得分率：${pct}%<br/>测验次数：${r.quizCount}`
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      name: '得分率',
      nameLocation: 'middle',
      nameGap,
      nameTextStyle: { fontSize: valFs },
      axisLabel: { formatter: '{value}%', fontSize: valFs },
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      /** 高于柱条，避免柱形盖住左侧中文 */
      z: 10,
      axisLabel: {
        align: 'left',
        verticalAlign: 'middle',
        margin: 120,
        fontSize: catFs,
        lineHeight: Math.round(catFs * 1.35),
        formatter: (val: string | number) => wrapAxisLabelText(String(val), AXIS_WRAP_CHARS),
      },
    },
    series: [
      {
        type: 'bar',
        data: values,
        z: 1,
        barMaxWidth: Math.min(28, Math.round(14 + catFs)),
      },
    ],
  }
}

function buildVideoOption() {
  const rows = chartData.value?.videoQuizAvg ?? []
  const categories = rows.map((r) => r.video_title)
  const values = rows.map((r) => {
    if (!r.attemptCount || r.avgAccuracy == null) return 0
    return Number((r.avgAccuracy * 100).toFixed(2))
  })
  const valFs = CHART_FONT_VALUE
  const catFs = CHART_FONT_CATEGORY
  const nameGap = Math.round(22 + valFs * 0.6)
  return {
    grid: { left: 0, right: 28, top: 16, bottom: Math.round(32 + valFs * 0.5), containLabel: true },
    textStyle: { fontSize: valFs },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      textStyle: { fontSize: valFs },
      formatter: (p: unknown) => {
        const arr = p as { dataIndex?: number }[]
        const i = arr[0]?.dataIndex ?? 0
        const r = rows[i]
        if (!r) return ''
        if (!r.attemptCount || r.avgAccuracy == null) {
          return `${r.video_title}<br/>暂无测验记录`
        }
        const pct = (r.avgAccuracy * 100).toFixed(1)
        return `${r.video_title}<br/>平均得分率：${pct}%<br/>提交次数：${r.attemptCount}`
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      name: '得分率',
      nameLocation: 'middle',
      nameGap,
      nameTextStyle: { fontSize: valFs },
      axisLabel: { formatter: '{value}%', fontSize: valFs },
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      z: 10,
      axisLabel: {
        align: 'left',
        verticalAlign: 'middle',
        margin: 150,
        fontSize: catFs,
        lineHeight: Math.round(catFs * 1.35),
        formatter: (val: string | number) => wrapAxisLabelText(String(val), AXIS_WRAP_CHARS),
      },
    },
    series: [
      {
        type: 'bar',
        data: values,
        z: 1,
        barMaxWidth: Math.min(28, Math.round(14 + catFs)),
      },
    ],
  }
}

async function renderCharts() {
  disposeCharts()
  await nextTick()
  if (hasUserChartData.value && userChartEl.value) {
    userChart = echarts.init(userChartEl.value)
    userChart.setOption(buildUserOption())
  }
  if (hasVideoChartData.value && videoChartEl.value) {
    videoChart = echarts.init(videoChartEl.value)
    videoChart.setOption(buildVideoOption())
  }
}

async function load() {
  loading.value = true
  try {
    stats.value = await fetchStats()
    chartData.value = await fetchChartStats()
    await nextTick()
    await renderCharts()
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

function goUsers() {
  router.push({ name: 'users' })
}

function goVideos() {
  router.push({ name: 'videos' })
}

function openQuestionsDialog() {
  questionsPage.value = 1
  questionsVisible.value = true
}

function onQuestionsDialogOpened() {
  loadQuestions()
}

function onQuestionsPageSizeChange() {
  questionsPage.value = 1
  loadQuestions()
}

async function loadQuestions() {
  questionsLoading.value = true
  questionsList.value = []
  try {
    const offset = (questionsPage.value - 1) * questionsPageSize.value
    const data = await fetchAllQuestionsPreview({
      limit: questionsPageSize.value,
      offset,
    })
    questionsList.value = data.list
    questionsTotal.value = data.total
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: string }).message)
        : '加载题目失败'
    ElMessage.error(msg)
    questionsTotal.value = 0
  } finally {
    questionsLoading.value = false
  }
}

onMounted(() => {
  load()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  disposeCharts()
})
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

.stat-card {
  margin-bottom: 1rem;
}

.stat-card--click {
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.stat-card--click:hover {
  box-shadow: 0 8px 24px rgba(26, 29, 46, 0.12);
}

.stat-card--click:focus {
  outline: 2px solid #7c5cff;
  outline-offset: 2px;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.35rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #1a1d2e;
}

.chart-row {
  margin-top: 0.5rem;
}

.chart-card {
  margin-bottom: 1rem;
  min-height: 380px;
}

/* 纵轴文字贴齐卡片内容区左缘，避免 el-card 默认左内边距留出大块空白 */
.chart-card :deep(.el-card__body) {
  padding-left: 0;
}

.chart-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1a1d2e;
}

.chart-host {
  width: 100%;
  min-height: 260px;
}

.quiz-records-pager {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.questions-preview-pager {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
