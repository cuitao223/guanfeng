<template>
  <div class="ui-preview">
    <section>
      <h2>{{ $t('widget.uiDemo.buttons') }}</h2>
      <div class="ui-preview__row">
        <el-button v-hasPermi="['sample:item:add']" class="manage-add-btn" @click="openCreate">{{ $t('widget.uiDemo.add') }}</el-button>
        <el-button v-hasPermi="['sample:item:remove']" class="manage-toolbar-btn" @click="confirmRemove()">{{ $t('widget.uiDemo.remove') }}</el-button>
      </div>
    </section>

    <section>
      <h2>{{ $t('widget.uiDemo.filter') }}</h2>
      <el-form class="panel-filter" :model="query" inline @submit.prevent>
        <el-form-item :label="$t('widget.uiDemo.name')">
          <el-input v-model="query.name" class="query-item--w180" clearable @keyup.enter="applyFilter" />
        </el-form-item>
        <el-form-item :label="$t('widget.uiDemo.status')">
          <el-select v-model="query.status" class="query-item--w160" clearable :placeholder="$t('widget.uiDemo.select')">
            <el-option :label="$t('widget.uiDemo.normal')" value="normal" />
            <el-option :label="$t('widget.uiDemo.offline')" value="offline" />
          </el-select>
        </el-form-item>
        <el-button type="primary" @click="applyFilter">{{ $t('widget.uiDemo.search') }}</el-button>
        <el-button @click="resetFilter">{{ $t('widget.uiDemo.reset') }}</el-button>
      </el-form>
    </section>

    <section>
      <h2>{{ $t('widget.uiDemo.table') }}</h2>
      <div class="panel-table">
        <el-table :data="pageRows">
          <el-table-column prop="name" :label="$t('widget.uiDemo.name')" />
          <el-table-column :label="$t('widget.uiDemo.status')">
            <template #default="{ row }">{{ $t(`widget.uiDemo.${row.statusKey}`) }}</template>
          </el-table-column>
          <el-table-column :label="$t('widget.uiDemo.actions')" class-name="small-padding">
            <template #default="{ row }">
              <el-button v-hasPermi="['sample:item:edit']" link @click="openEdit(row)">{{ $t('widget.uiDemo.edit') }}</el-button>
              <el-button v-hasPermi="['sample:item:remove']" link @click="confirmRemove(row)">{{ $t('widget.uiDemo.remove') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        class="panel-pagination"
        :page-sizes="[5, 10, 20]"
        :total="filtered.length"
        layout="total, sizes, prev, pager, next"
      />
    </section>

    <section>
      <h2>{{ $t('widget.uiDemo.rings') }}</h2>
      <div class="ui-preview__rings">
        <percent-ring :percent="10" />
        <percent-ring :percent="25" />
        <percent-ring :percent="75" />
      </div>
    </section>

    <el-dialog v-model="open" class="platform-form-dialog platform-form-dialog--sm" :title="dialogTitle" @closed="resetDialog">
      <el-form ref="form" :model="form" :rules="rules">
        <el-form-item :label="$t('widget.uiDemo.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="platform-dialog-footer">
          <el-button class="platform-dialog-btn platform-dialog-btn--cancel" @click="open = false">{{ $t('widget.uiDemo.cancel') }}</el-button>
          <el-button class="platform-dialog-btn platform-dialog-btn--confirm" @click="save">{{ $t('widget.uiDemo.confirm') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import PercentRing from '@/components/PercentRing/index.vue'

export default {
  name: 'UiPreview',
  components: { PercentRing },
  data() {
    return {
      query: { name: '', status: '' },
      keyword: '',
      status: '',
      pageNum: 1,
      pageSize: 5,
      open: false,
      editing: null,
      form: { name: '' },
      rows: [
        { name: 'type1', statusKey: 'normal' },
        { name: 'type2', statusKey: 'offline' },
        { name: 'type4', statusKey: 'normal' },
        { name: 'type3', statusKey: 'normal' },
        { name: 'type5', statusKey: 'offline' },
        { name: 'type6', statusKey: 'normal' }
      ]
    }
  },
  computed: {
    rules() {
      return {
        name: [{ required: true, message: this.$t('widget.uiDemo.nameRequired'), trigger: 'blur' }]
      }
    },
    dialogTitle() {
      return this.editing ? this.$t('widget.uiDemo.edit') : this.$t('widget.uiDemo.add')
    },
    filtered() {
      const keyword = this.keyword.trim().toLowerCase()
      return this.rows.filter((row) => {
        const nameOk = !keyword || row.name.toLowerCase().includes(keyword)
        const statusOk = !this.status || row.statusKey === this.status
        return nameOk && statusOk
      })
    },
    pageRows() {
      const start = (this.pageNum - 1) * this.pageSize
      return this.filtered.slice(start, start + this.pageSize)
    }
  },
  methods: {
    applyFilter() {
      this.keyword = this.query.name
      this.status = this.query.status
      this.pageNum = 1
    },
    resetFilter() {
      this.query.name = ''
      this.query.status = ''
      this.keyword = ''
      this.status = ''
      this.pageNum = 1
    },
    openCreate() {
      this.editing = null
      this.form.name = ''
      this.open = true
    },
    openEdit(row) {
      this.editing = row
      this.form.name = row.name
      this.open = true
    },
    resetDialog() {
      this.editing = null
      this.form.name = ''
      if (this.$refs.form) this.$refs.form.clearValidate()
    },
    save() {
      this.$refs.form.validate((valid) => {
        if (!valid) return
        const name = this.form.name.trim()
        if (this.editing) {
          this.editing.name = name
        } else {
          this.rows.unshift({ name, statusKey: 'normal' })
        }
        this.open = false
        ElMessage.success(this.$t('widget.uiDemo.saved'))
      })
    },
    confirmRemove(row) {
      const target = row || this.pageRows[0]
      if (!target) return
      ElMessageBox.confirm(this.$t('widget.uiDemo.removeConfirm'), '', {
        type: 'warning',
        showClose: false,
        confirmButtonText: this.$t('widget.uiDemo.confirm'),
        cancelButtonText: this.$t('widget.uiDemo.cancel'),
        customClass: 'platform-msgbox platform-msgbox--warning'
      }).then(() => {
        this.rows = this.rows.filter((item) => item !== target)
        ElMessage.success(this.$t('widget.uiDemo.removed'))
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.ui-preview {
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  padding-right: 4px;
}
.ui-preview section {
  margin-bottom: 20px;
}
.ui-preview h2 {
  margin: 0 0 12px;
  color: #fff;
  font-size: 18px;
}
.ui-preview__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.ui-preview :deep(.el-pagination) {
  margin-top: 12px;
}
.ui-preview__rings {
  display: flex;
  gap: 40px;
  width: fit-content;
  padding: 24px 36px 18px;
  border-radius: 12px;
  background: #fff;
}
</style>
