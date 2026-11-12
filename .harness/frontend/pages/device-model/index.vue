<template>
  <div class="device-model-page">
    <el-form :model="query" inline @submit.prevent>
      <el-form-item :label="$t('deviceModel.name')">
        <el-input
          v-model="query.name"
          class="query-item--w180"
          clearable
          @keyup.enter="searchList"
          @clear="searchList"
        />
      </el-form-item>
      <el-button
        v-hasPermi="['system:model:query']"
        type="primary"
        @click="searchList"
      >{{ $t('deviceModel.search') }}</el-button>
    </el-form>
    <el-button
      v-hasPermi="['system:model:add']"
      class="manage-add-btn"
      @click="openCreate"
    >{{ $t('deviceModel.add') }}</el-button>
    <div class="device-model-table panel-table">
      <el-table :data="rows" height="100%">
        <el-table-column :label="$t('deviceModel.index')">
          <template #default="scope">{{ rowNo(scope.$index) }}</template>
        </el-table-column>
        <el-table-column prop="name" :label="$t('deviceModel.name')" />
        <el-table-column prop="weight" :label="$t('deviceModel.weight')" />
        <el-table-column prop="memo" :label="$t('deviceModel.memo')" />
        <el-table-column prop="type" :label="$t('deviceModel.type')" />
        <el-table-column prop="color" :label="$t('deviceModel.color')" />
        <el-table-column prop="n1">
          <template #header>
            <span>N1</span>
            <el-tooltip :content="$t('deviceModel.n1ColumnTip')" placement="top">
              <span class="device-model-help">?</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="ob1">
          <template #header>
            <span>OB1</span>
            <el-tooltip :content="$t('deviceModel.ob1ColumnTip')" placement="top">
              <span class="device-model-help">?</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="n2">
          <template #header>
            <span>N2</span>
            <el-tooltip :content="$t('deviceModel.n2ColumnTip')" placement="top">
              <span class="device-model-help">?</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="ob2">
          <template #header>
            <span>OB2</span>
            <el-tooltip :content="$t('deviceModel.ob2ColumnTip')" placement="top">
              <span class="device-model-help">?</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column :label="$t('deviceModel.actions')">
          <template #default="scope">
            <el-button
              v-hasPermi="['system:model:edit']"
              link
              type="primary"
              @click="openEdit(scope.row.modelId)"
            >{{ $t('deviceModel.edit') }}</el-button>
            <el-button
              v-hasPermi="['system:model:remove']"
              link
              type="danger"
              @click="removeRow(scope.row)"
            >{{ $t('deviceModel.remove') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-pagination
      :current-page="query.pageNum"
      :page-size="query.pageSize"
      :page-sizes="[5, 10, 20, 50]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="onPageSize"
      @current-change="onPageChange"
    />
    <el-dialog
      v-model="open"
      :title="title"
      class="platform-form-dialog platform-form-dialog--md"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="modelFormRef" class="device-model-form" :model="form" :rules="rules">
        <el-form-item :label="$t('deviceModel.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="$t('deviceModel.weight')" prop="weight">
          <el-input v-model="form.weight" />
        </el-form-item>
        <el-form-item :label="$t('deviceModel.memo')" prop="memo">
          <el-input v-model="form.memo" />
        </el-form-item>
        <el-form-item :label="$t('deviceModel.type')" prop="type">
          <el-input v-model="form.type" />
        </el-form-item>
        <el-form-item :label="$t('deviceModel.color')" prop="color">
          <el-input v-model="form.color" />
        </el-form-item>
        <el-form-item prop="n1">
          <template #label>
            <el-tooltip :content="$t('deviceModel.n1FormTip')" placement="top">
              <span class="device-model-help">?</span>
            </el-tooltip>
            <span>{{ $t('deviceModel.gateN1') }}</span>
          </template>
          <el-input v-model="form.n1" />
        </el-form-item>
        <el-form-item :label="$t('deviceModel.thresholdOb1')" prop="ob1">
          <el-input v-model="form.ob1" />
        </el-form-item>
        <el-form-item prop="n2">
          <template #label>
            <el-tooltip :content="$t('deviceModel.n2FormTip')" placement="top">
              <span class="device-model-help">?</span>
            </el-tooltip>
            <span>{{ $t('deviceModel.gateN2') }}</span>
          </template>
          <el-input v-model="form.n2" />
        </el-form-item>
        <el-form-item :label="$t('deviceModel.thresholdOb2')" prop="ob2">
          <el-input v-model="form.ob2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open = false">{{ $t('deviceModel.cancel') }}</el-button>
        <el-button type="primary" @click="saveModel">{{ $t('deviceModel.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addDeviceModel,
  deleteDeviceModel,
  getDeviceModel,
  listDeviceModel,
  updateDeviceModel
} from '@/api/manage/deviceModel'

function blankModel() {
  return {
    modelId: undefined,
    name: '',
    weight: '',
    memo: '',
    type: '',
    color: '',
    n1: '',
    ob1: '',
    n2: '',
    ob2: ''
  }
}

export default {
  name: 'DeviceModelPage',
  data() {
    return {
      query: { name: '', pageNum: 1, pageSize: 10 },
      rows: [],
      total: 0,
      open: false,
      title: '',
      form: blankModel(),
      paging: false
    }
  },
  computed: {
    rules() {
      return {
        name: [
          { required: true, message: this.$t('deviceModel.nameRequired'), trigger: 'blur' },
          { min: 2, max: 20, message: this.$t('deviceModel.nameLength'), trigger: 'blur' }
        ],
        n1: [this.integerRule()],
        n2: [this.integerRule()],
        ob1: [this.numberRule()],
        ob2: [this.numberRule()]
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    integerRule() {
      return {
        validator: (rule, value, callback) => {
          if (value === '' || value === null || value === undefined) {
            callback()
            return
          }
          if (/^[0-9]+$/.test(String(value))) callback()
          else callback(new Error(this.$t('deviceModel.integer')))
        },
        trigger: 'blur'
      }
    },
    numberRule() {
      return {
        validator: (rule, value, callback) => {
          if (value === '' || value === null || value === undefined) {
            callback()
            return
          }
          if (/^[0-9]+(\.[0-9]+)?$/.test(String(value))) callback()
          else callback(new Error(this.$t('deviceModel.number')))
        },
        trigger: 'blur'
      }
    },
    rowNo(index) {
      return (this.query.pageNum - 1) * this.query.pageSize + index + 1
    },
    getList() {
      listDeviceModel(this.query).then((res) => {
        this.rows = res.rows || []
        this.total = res.total || 0
      }).catch(() => {
        this.rows = []
        this.total = 0
      })
    },
    searchList() {
      this.query.pageNum = 1
      this.getList()
    },
    onPageSize(size) {
      this.paging = true
      this.query.pageSize = size
      this.query.pageNum = 1
      this.getList()
      this.$nextTick(() => {
        this.paging = false
      })
    },
    onPageChange(page) {
      if (this.paging) return
      this.query.pageNum = page
      this.getList()
    },
    openCreate() {
      this.title = this.$t('deviceModel.createTitle')
      this.form = blankModel()
      this.open = true
    },
    openEdit(modelId) {
      this.title = this.$t('deviceModel.editTitle')
      this.form = blankModel()
      this.open = true
      getDeviceModel(modelId).then((res) => {
        this.form = Object.assign(blankModel(), res.data || {})
      }).catch(() => {})
    },
    resetForm() {
      this.form = blankModel()
      if (this.$refs.modelFormRef) this.$refs.modelFormRef.resetFields()
    },
    payload() {
      const data = Object.assign({}, this.form)
      Object.keys(data).forEach((key) => {
        if (data[key] === '') data[key] = null
      })
      return data
    },
    saveModel() {
      this.$refs.modelFormRef.validate((valid) => {
        if (!valid) return
        const data = this.payload()
        const request = data.modelId ? updateDeviceModel(data) : addDeviceModel(data)
        request.then(() => {
          ElMessage.success(this.$t('deviceModel.saved'))
          this.open = false
          this.getList()
        }).catch(() => {})
      })
    },
    removeRow(row) {
      ElMessageBox.confirm(
        this.$t('deviceModel.deleteConfirm', { name: row.name }),
        this.$t('deviceModel.notice'),
        { type: 'warning' }
      ).then(() => deleteDeviceModel(row.modelId)).then(() => {
        ElMessage.success(this.$t('deviceModel.deleted'))
        this.getList()
      }).catch((error) => {
        if (error === 'cancel' || error === 'close') {
          ElMessage.info(this.$t('deviceModel.deleteCanceled'))
        }
      })
    }
  }
}
</script>

<style scoped>
.device-model-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.device-model-page > :not(.device-model-table) {
  flex-shrink: 0;
}

.device-model-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.query-item--w180 {
  width: 180px;
}

.manage-add-btn {
  height: 32px;
  border-radius: 8px;
}

.device-model-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-right: 4px;
  border-radius: 50%;
  color: #a7c4fc;
  cursor: help;
}

.device-model-form {
  --platform-form-label-width: 120px;
}

.device-model-form :deep(.el-form-item__label) {
  width: var(--platform-form-label-width);
}

.device-model-page :deep(.el-pagination) {
  justify-content: flex-end;
  margin-top: 10px;
}
</style>
