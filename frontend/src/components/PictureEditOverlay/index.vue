<template>
  <div v-show="active" class="picture-edit">
    <div
      ref="layer"
      class="picture-edit__layer"
      :class="'is-' + (drawMode || 'idle')"
      @mousedown="onDrawDown"
      @mousemove="onDrawMove"
      @mouseup="onDrawUp"
      @mouseleave="onDrawUp"
    >
      <div
        v-for="item in drawings"
        :key="item.id"
        class="picture-edit__item"
        :class="'is-' + item.type"
        :style="itemStyle(item)"
        @mousedown.stop="onItemDown(item, $event)"
      >
        <span v-if="item.type === 'text'">{{ item.text }}</span>
      </div>
      <div v-if="draft" class="picture-edit__item" :class="'is-' + draft.type" :style="itemStyle(draft)"></div>
    </div>
    <div class="picture-edit__bar">
      <div class="picture-edit__group">
        <button
          v-for="mode in drawModes"
          :key="mode"
          type="button"
          class="picture-edit__btn"
          :class="{ 'is-active': drawMode === mode }"
          @click="toggleDrawMode(mode)"
        >
          {{ $t('widget.wind3d.picture.' + mode) }}
        </button>
      </div>
      <div class="picture-edit__group">
        <button type="button" class="picture-edit__btn" @click="undoDraw">{{ $t('widget.wind3d.picture.undo') }}</button>
        <button type="button" class="picture-edit__btn" @click="clearDraw">{{ $t('widget.wind3d.picture.clear') }}</button>
        <button type="button" class="picture-edit__btn" @click="downloadDraw">{{ $t('widget.wind3d.picture.download') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ElMessageBox } from 'element-plus'

export default {
  name: 'PictureEditOverlay',
  props: {
    active: { type: Boolean, default: false }
  },
  data() {
    return {
      drawModes: ['text', 'marker', 'rect', 'circle', 'edit'],
      drawMode: '',
      drawings: [],
      draft: null,
      drag: null,
      drawSeq: 1
    }
  },
  watch: {
    active(value) {
      if (value) {
        if (!this.drawMode) this.drawMode = 'text'
        return
      }
      this.drawMode = ''
      this.drawings = []
      this.draft = null
      this.drag = null
    }
  },
  methods: {
    toggleDrawMode(mode) {
      this.drawMode = this.drawMode === mode ? '' : mode
      this.draft = null
      this.drag = null
    },
    stagePoint(event) {
      const node = this.$refs.layer
      if (!node) return null
      const rect = node.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      return {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100
      }
    },
    itemStyle(item) {
      const style = { left: item.x + '%', top: item.y + '%' }
      if (item.w) style.width = item.w + '%'
      if (item.h) style.height = item.h + '%'
      return style
    },
    pushDrawing(item) {
      this.drawings.push({ ...item, id: this.drawSeq })
      this.drawSeq += 1
    },
    onDrawDown(event) {
      if (!this.active || this.drawMode === 'edit') return
      const point = this.stagePoint(event)
      if (!point) return
      if (this.drawMode === 'text') {
        this.addDrawText(point)
        return
      }
      if (this.drawMode === 'marker') {
        this.pushDrawing({ type: 'marker', x: point.x, y: point.y })
        return
      }
      if (this.drawMode === 'rect' || this.drawMode === 'circle') {
        this.draft = { type: this.drawMode, x: point.x, y: point.y, w: 0, h: 0, originX: point.x, originY: point.y }
      }
    },
    onDrawMove(event) {
      const point = this.stagePoint(event)
      if (!point) return
      if (this.drag) {
        const item = this.drawings.find((row) => row.id === this.drag.id)
        if (!item) return
        item.x = point.x - this.drag.dx
        item.y = point.y - this.drag.dy
        return
      }
      if (!this.draft) return
      this.draft.x = Math.min(this.draft.originX, point.x)
      this.draft.y = Math.min(this.draft.originY, point.y)
      this.draft.w = Math.abs(point.x - this.draft.originX)
      this.draft.h = Math.abs(point.y - this.draft.originY)
    },
    onDrawUp() {
      if (this.drag) {
        this.drag = null
        return
      }
      if (!this.draft) return
      const shape = this.draft
      this.draft = null
      if (shape.w < 0.4 || shape.h < 0.4) return
      this.pushDrawing({ type: shape.type, x: shape.x, y: shape.y, w: shape.w, h: shape.h })
    },
    onItemDown(item, event) {
      if (this.drawMode !== 'edit') return
      const point = this.stagePoint(event)
      if (!point) return
      this.drag = { id: item.id, dx: point.x - item.x, dy: point.y - item.y }
    },
    addDrawText(point) {
      ElMessageBox.prompt(
        this.$t('widget.wind3d.picture.textPrompt'),
        this.$t('widget.wind3d.picture.textTitle'),
        {
          confirmButtonText: this.$t('widget.wind3d.legend.confirm'),
          cancelButtonText: this.$t('widget.wind3d.legend.cancel')
        }
      ).then(({ value }) => {
        const text = String(value || '').trim()
        if (!text) return
        this.pushDrawing({ type: 'text', x: point.x, y: point.y, text })
      }).catch(() => {})
    },
    undoDraw() {
      this.drawings.pop()
    },
    clearDraw() {
      this.drawings = []
      this.draft = null
    },
    downloadDraw() {
      const node = this.$refs.layer
      if (!node) return
      const rect = node.getBoundingClientRect()
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(rect.width))
      canvas.height = Math.max(1, Math.round(rect.height))
      const context = canvas.getContext('2d')
      context.fillStyle = '#07141c'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = '#46c4c8'
      context.fillStyle = '#ffffff'
      context.lineWidth = 2
      context.font = '16px sans-serif'
      this.drawings.forEach((item) => {
        const x = (item.x / 100) * canvas.width
        const y = (item.y / 100) * canvas.height
        if (item.type === 'text') {
          context.fillText(item.text, x, y)
          return
        }
        if (item.type === 'marker') {
          context.beginPath()
          context.arc(x, y, 6, 0, Math.PI * 2)
          context.fill()
          return
        }
        const w = ((item.w || 0) / 100) * canvas.width
        const h = ((item.h || 0) / 100) * canvas.height
        context.beginPath()
        if (item.type === 'circle') context.ellipse(x + w / 2, y + h / 2, Math.max(w, 1) / 2, Math.max(h, 1) / 2, 0, 0, Math.PI * 2)
        else context.rect(x, y, w, h)
        context.stroke()
      })
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'map-sketch.png'
      link.click()
    }
  }
}
</script>

<style lang="scss" scoped>
.picture-edit {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.picture-edit__layer {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: auto;
}
.picture-edit__layer.is-text,
.picture-edit__layer.is-marker,
.picture-edit__layer.is-rect,
.picture-edit__layer.is-circle {
  cursor: crosshair;
}
.picture-edit__layer.is-edit {
  cursor: default;
}
.picture-edit__item {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
}
.picture-edit__layer.is-edit .picture-edit__item {
  pointer-events: auto;
  cursor: move;
}
.picture-edit__item.is-text {
  color: #ffffff;
  font-size: 16px;
  line-height: 22px;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
.picture-edit__item.is-marker {
  width: 12px;
  height: 12px;
  margin-left: -6px;
  margin-top: -6px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #46c4c8;
}
.picture-edit__item.is-rect,
.picture-edit__item.is-circle {
  border: 2px solid #46c4c8;
  background: rgba(70, 196, 200, 0.16);
}
.picture-edit__item.is-circle {
  border-radius: 50%;
}
.picture-edit__bar {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 80%;
  height: 60px;
  padding: 0 16px;
  box-sizing: border-box;
  transform: translateX(-50%);
  border: 1px solid rgba(70, 196, 200, 0.45);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  backdrop-filter: blur(36px);
}
.picture-edit__group {
  display: flex;
  gap: 8px;
}
.picture-edit__btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(70, 196, 200, 0.7);
  border-radius: 4px;
  background: rgba(70, 196, 200, 0.6);
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}
.picture-edit__btn:hover {
  background: rgba(70, 196, 200, 0.85);
}
.picture-edit__btn.is-active {
  background: #0e6e72;
  border-color: #d7fffb;
}
</style>
