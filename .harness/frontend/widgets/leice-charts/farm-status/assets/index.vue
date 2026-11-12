<template>
  <section class="farm-board">
    <header class="farm-board__head">
      <span class="farm-board__mark" />
      <span class="farm-board__title">{{ titleText }}</span>
      <span v-if="updated" class="farm-board__time">{{ $t('widget.farm.updated') }}: {{ updated }}</span>
    </header>
    <div v-if="location" class="farm-board__location">{{ location }}</div>
    <div class="farm-board__list">
      <div
        v-for="item in items"
        :key="item.key || item.label"
        class="farm-board__item"
        :class="item.tone === 'blue' ? 'is-blue' : 'is-purple'"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <el-tooltip v-if="item.alarm" :content="item.alarm" placement="right">
          <span class="farm-board__alarm">!</span>
        </el-tooltip>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'FarmStatusBoard',
  props: {
    title: { type: String, default: '' },
    updated: { type: String, default: '' },
    location: { type: String, default: '' },
    items: { type: Array, default: () => [] }
  },
  computed: {
    titleText() {
      return this.title || this.$t('widget.farm.overview')
    }
  }
}
</script>

<style lang="scss" scoped>
.farm-board {
  box-sizing: border-box;
  height: 100%;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
}
.farm-board__head {
  display: flex;
  align-items: center;
  min-height: 20px;
}
.farm-board__mark {
  width: 2px;
  height: 14px;
  margin-right: 6px;
  background: #206df1;
}
.farm-board__title {
  color: #171717;
  font-size: 16px;
  font-weight: 800;
}
.farm-board__time {
  margin-left: 8px;
  color: #767676;
  font-size: 12px;
}
.farm-board__location {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  color: #404040;
  font-size: 14px;
}
.farm-board__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.farm-board__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 46px;
  padding: 0 20px;
  border-radius: 2px;
  color: #3d3d3d;
  font-size: 16px;
}
.farm-board__item strong {
  color: #404040;
  font-size: 22px;
  font-weight: 700;
}
.farm-board__item.is-purple {
  background: rgba(32, 109, 241, 0.08);
}
.farm-board__item.is-blue {
  background: rgba(38, 185, 226, 0.08);
}
.farm-board__alarm {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #d41315;
  color: #fff;
  font-size: 12px;
  line-height: 16px;
  text-align: center;
  cursor: default;
}
</style>
