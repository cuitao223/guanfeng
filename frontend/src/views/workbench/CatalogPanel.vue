<template>
  <section class="wb-section" v-loading="busy">
    <el-alert v-if="error" :title="error" type="error" :closable="false"/>
    <div class="wb-card">
      <div class="wb-toolbar"><h2>{{ t('catalog') }}</h2><el-input v-model="search" class="query-item--w220" :placeholder="t('search')" clearable/><el-button class="manage-toolbar-btn" @click="load">{{ t('refresh') }}</el-button><el-button type="primary" :disabled="!canEdit" @click="reload">{{ t('reload') }}</el-button></div>
      <el-table :data="filtered" stripe @row-click="selected = $event"><el-table-column prop="id" label="ID"/><el-table-column prop="name" :label="t('name')"/><el-table-column prop="version" :label="t('version')"/><el-table-column prop="category" :label="t('category')"/><el-table-column prop="inputType" :label="t('inputType')"/><el-table-column prop="outputType" :label="t('outputType')"/><el-table-column prop="origin" :label="t('source')"/></el-table>
    </div>
    <div class="wb-two">
      <div class="wb-card"><h2>{{ t('schema') }}</h2><template v-if="selected"><h3>{{ selected.name || selected.id }} · {{ selected.version }}</h3><p class="wb-muted">{{ selected.description }}</p><pre class="wb-json">{{ json({ parameters: selected.parameters, inputSchema: selected.inputSchema, outputSchema: selected.outputSchema, unit: selected.unit, tags: selected.tags, example: selected.example, testReference: selected.testReference }) }}</pre></template><el-empty v-else :description="t('empty')"/></div>
      <div class="wb-card"><h2>{{ t('plugins') }}</h2><p class="wb-muted">{{ t('pluginDirectory') }} · {{ t('count') }}: {{ plugins.length }}</p><pre v-if="reloadResult" class="wb-json">{{ json(reloadResult) }}</pre><p v-if="!canEdit" class="wb-muted">{{ t('noSession') }}</p><el-table :data="plugins" stripe><el-table-column prop="id" label="ID"/><el-table-column prop="version" :label="t('version')"/><el-table-column :label="t('enabled')"><template #default="{row}"><el-switch :model-value="row.enabled" :disabled="!canEdit || busy" @change="state(row,$event)"/></template></el-table-column></el-table></div>
    </div>
  </section>
</template>
<script>
import { wb } from '@/api/workbench'
export default {
  name: 'WorkbenchCatalog', props: { session: Object }, emits: ['changed'],
  data() { return { components: [], plugins: [], selected: null, search: '', reloadResult: null, busy: false, error: '' } },
  computed: { canEdit() { return this.session?.role === 'editor' }, filtered() { const q=this.search.toLowerCase(); return this.components.filter(c => [c.id,c.name,c.category,c.version,c.description,...(c.tags || [])].join(' ').toLowerCase().includes(q)) } },
  created() { this.load() },
  methods: {
    t(key) { return this.$t(`workbench.${key}`) }, json(value) { return JSON.stringify(value, null, 2) },
    async load() { this.busy=true; this.error=''; const results=await Promise.allSettled([wb('/components'),wb('/plugins')]); if(results[0].status==='fulfilled') { this.components=results[0].value || []; this.selected=this.components.find(c=>c.id===this.selected?.id && c.version===this.selected?.version) || this.components[0] } if(results[1].status==='fulfilled') this.plugins=(results[1].value || []).filter(c=>c.expression !== undefined || c.origin === 'plugin'); this.error=results.filter(r=>r.status==='rejected').map(r=>r.reason.message).join(' · '); this.busy=false },
    async reload() { if(!this.canEdit)return; this.busy=true; try { this.reloadResult = await wb('/plugins/reload',{method:'post',session:this.session.token}); await this.load(); this.$emit('changed') } catch(e){this.error=e.message} finally{this.busy=false} },
    async state(plugin,enabled) { if(!this.canEdit)return; this.busy=true; try { await wb('/plugins/state',{method:'post',session:this.session.token,data:{id:plugin.id,version:plugin.version,enabled}}); await this.load(); this.$emit('changed') } catch(e){this.error=e.message} finally{this.busy=false} }
  }
}
</script>
