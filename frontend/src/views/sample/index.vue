<template>
  <div class="sample-page">
    <el-form class="panel-filter" :model="query" inline @submit.prevent>
      <el-form-item label="名称">
        <el-input v-model="query.name" class="query-item--w180" clearable />
      </el-form-item>
      <el-button type="primary" @click="getList">查询</el-button>
    </el-form>
    <el-button
      v-hasPermi="['sample:item:add']"
      class="manage-add-btn"
      @click="open = true"
    >新增</el-button>
    <div class="sample-table panel-table">
      <el-table :data="rows" height="100%">
        <el-table-column prop="name" label="名称" />
      </el-table>
    </div>
    <el-dialog v-model="open" class="platform-form-dialog platform-form-dialog--sm" title="新增">
        <el-form :model="form">
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import { listSample } from '@/api/sample'

export default {
  name: 'SamplePage',
  props: { referenceMode: { type: Boolean, default: false } },
  data() {
    return {
      query: { name: '' },
      rows: [],
      open: false,
      form: { name: '' }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      if(this.referenceMode) { this.rows=[];return }
      listSample(this.query).then((res) => {
        this.rows = res.rows || []
      }).catch(() => {
        this.rows = []
      })
    }
  }
}
</script>

<style scoped>
.sample-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.sample-page > :not(.sample-table) {
  flex-shrink: 0;
}

.sample-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

</style>
