<template>
  <div class="option-group" :class="{ 'is-disabled': disabled }">
    <div class="option-group__title">
      <i class="option-group__mark" aria-hidden="true"></i>
      <span>{{ title }}</span>
      <span v-if="hint" class="option-group__hint">{{ hint }}</span>
    </div>
    <div v-if="showMode" class="option-group__mode">
      <el-switch
        class="wind-compact-switch"
        size="small"
        :model-value="mode === 'multi'"
        :active-text="multiText"
        :inactive-text="singleText"
        :disabled="disabled"
        @change="onMode"
      />
      <el-checkbox
        v-if="mode === 'multi' && showSelectAll"
        class="option-group__all"
        :model-value="allSelected"
        :indeterminate="indeterminate"
        :disabled="disabled"
        @change="onSelectAll"
      >
        {{ selectAllText }}
      </el-checkbox>
    </div>
    <slot></slot>
    <div v-if="options.length" class="option-group__grid" :class="{ 'is-one': columns === 1 }">
      <el-checkbox-group
        v-if="mode === 'multi'"
        :model-value="multiValue"
        :disabled="disabled"
        @change="onMulti"
      >
        <el-checkbox
          v-for="item in options"
          :key="String(item.value)"
          :value="item.value"
          :disabled="disabled || isDisabled(item.value)"
        >
          {{ item.label }}
        </el-checkbox>
      </el-checkbox-group>
      <el-radio-group
        v-else
        :model-value="singleValue"
        :disabled="disabled"
        @change="onSingle"
      >
        <el-radio
          v-for="item in options"
          :key="String(item.value)"
          :value="item.value"
          :disabled="disabled || isDisabled(item.value)"
          @click="onRadioClick(item.value, $event)"
        >
          {{ item.label }}
        </el-radio>
      </el-radio-group>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WindOptionGroup',
  props: {
    title: { type: String, default: '' },
    hint: { type: String, default: '' },
    options: { type: Array, default() { return [] } },
    modelValue: { type: [Array, String, Number], default: null },
    mode: { type: String, default: 'multi' },
    showMode: { type: Boolean, default: false },
    showSelectAll: { type: Boolean, default: false },
    allowDeselect: { type: Boolean, default: false },
    columns: { type: Number, default: 3 },
    disabled: { type: Boolean, default: false },
    disabledValues: { type: Array, default() { return [] } },
    exclusiveGroups: { type: Array, default() { return [] } },
    singleText: { type: String, default: '' },
    multiText: { type: String, default: '' },
    selectAllText: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'update:mode'],
  computed: {
    multiValue() {
      return Array.isArray(this.modelValue) ? this.modelValue : []
    },
    singleValue() {
      return Array.isArray(this.modelValue) ? (this.modelValue[0] ?? null) : this.modelValue
    },
    enabledValues() {
      return this.options
        .map((item) => item.value)
        .filter((value) => !this.isDisabled(value))
    },
    allSelected() {
      return this.enabledValues.length > 0 && this.enabledValues.every((value) => this.multiValue.includes(value))
    },
    indeterminate() {
      const count = this.enabledValues.filter((value) => this.multiValue.includes(value)).length
      return count > 0 && count < this.enabledValues.length
    }
  },
  methods: {
    isDisabled(value) {
      return this.disabledValues.includes(value)
    },
    applyExclusive(values) {
      let next = [...values]
      const previous = this.multiValue
      this.exclusiveGroups.forEach((group) => {
        if (!Array.isArray(group) || group.length < 2) return
        const selected = group.filter((item) => next.includes(item))
        if (selected.length <= 1) return
        const added = selected.filter((item) => !previous.includes(item))
        const keep = added.length ? added[added.length - 1] : selected[selected.length - 1]
        next = next.filter((item) => !group.includes(item) || item === keep)
      })
      return next
    },
    onMode(isMulti) {
      const mode = isMulti ? 'multi' : 'single'
      const current = this.modelValue
      const list = Array.isArray(current) ? current : (current == null || current === '' ? [] : [current])
      const value = mode === 'multi' ? list : (list[0] ?? null)
      this.$emit('update:mode', mode)
      this.$emit('update:modelValue', value)
    },
    onMulti(values) {
      const allowed = (values || []).filter((value) => !this.isDisabled(value))
      this.$emit('update:modelValue', this.applyExclusive(allowed))
    },
    onSingle(value) {
      if (this.allowDeselect && (value == null || value === '')) return
      this.$emit('update:modelValue', value)
    },
    onRadioClick(value, event) {
      if (!this.allowDeselect || this.disabled || this.isDisabled(value)) return
      if (this.singleValue !== value) return
      if (event && event.preventDefault) event.preventDefault()
      this.$emit('update:modelValue', null)
    },
    onSelectAll(checked) {
      if (!checked) {
        this.$emit('update:modelValue', [])
        return
      }
      this.$emit('update:modelValue', this.applyExclusive(this.enabledValues))
    }
  }
}
</script>

<style lang="scss" scoped>
.option-group {
  width: 100%;
  padding: 4px 14px 0;
  box-sizing: border-box;
}
.option-group.is-disabled {
  opacity: 0.55;
}
.option-group__title {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
  color: #fff;
  font-size: 14px;
}
.option-group__mark {
  width: 0;
  height: 0;
  margin-right: 8px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 4px solid #29dbc9;
}
.option-group__hint {
  margin-left: 8px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.2;
}
.option-group__mode {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  margin-bottom: 12px;
}
.option-group__all {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
}
.option-group__grid {
  margin-bottom: 12px;
}
.option-group__grid :deep(.el-checkbox-group),
.option-group__grid :deep(.el-radio-group) {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}
.option-group__grid.is-one :deep(.el-checkbox-group),
.option-group__grid.is-one :deep(.el-radio-group) {
  grid-template-columns: minmax(0, 1fr);
}
.option-group :deep(.el-checkbox),
.option-group :deep(.el-radio) {
  height: auto;
  margin-right: 0;
  color: #fff;
}
.option-group :deep(.el-checkbox__label),
.option-group :deep(.el-radio__label) {
  color: #fff;
  font-size: 14px;
}
.option-group :deep(.el-checkbox__input.is-checked + .el-checkbox__label),
.option-group :deep(.el-checkbox__input.is-indeterminate + .el-checkbox__label),
.option-group :deep(.el-radio__input.is-checked + .el-radio__label) {
  color: #29dbc9;
}
.option-group :deep(.el-checkbox__inner),
.option-group :deep(.el-radio__inner) {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.55);
}
.option-group :deep(.el-checkbox__input.is-checked .el-checkbox__inner),
.option-group :deep(.el-checkbox__input.is-indeterminate .el-checkbox__inner),
.option-group :deep(.el-radio__input.is-checked .el-radio__inner) {
  background: #29dbc9;
  border-color: #29dbc9;
}
.option-group :deep(.el-checkbox__inner:hover),
.option-group :deep(.el-radio__inner:hover) {
  border-color: #29dbc9;
}
.option-group :deep(.wind-compact-switch) {
  height: auto;
}
.option-group :deep(.wind-compact-switch .el-switch__label) {
  color: #fff;
  font-size: 12px;
}
.option-group :deep(.wind-compact-switch .el-switch__label.is-active) {
  color: #29dbc9;
}
.option-group :deep(.wind-compact-switch .el-switch__core) {
  min-width: 32px;
  height: 16px;
  background: rgba(41, 219, 201, 0.2);
  border-color: transparent;
}
.option-group :deep(.wind-compact-switch.is-checked .el-switch__core) {
  background: rgba(41, 219, 201, 0.2);
  border-color: transparent;
}
.option-group :deep(.wind-compact-switch .el-switch__action) {
  background: #29dbc9;
}
</style>
