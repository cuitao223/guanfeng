<template>
  <section class="wb-section">
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon/>
    <div class="wb-card" v-loading="submitting">
      <h2>{{ t('generation') }}</h2>
      <el-alert v-if="health && !health.modelConfigured" type="warning" :title="t('modelMissing')" :closable="false"/>
      <el-form :model="form" label-position="top" @submit.prevent="submit">
        <el-form-item :label="t('prompt')"><el-input v-model="form.prompt" type="textarea" :rows="4" :placeholder="t('promptPlaceholder')" :aria-label="t('prompt')"/></el-form-item>
        <div class="wb-toolbar"><el-select v-model="form.datasetId" class="query-item--w220" :placeholder="t('dataset')" clearable><el-option v-for="d in datasets" :key="d.id" :value="d.id" :label="d.name || d.id"/></el-select><el-button type="primary" native-type="submit" :disabled="!form.prompt.trim()" data-testid="generate">{{ t('generate') }}</el-button></div>
      <el-collapse><el-collapse-item :title="$t('portal.advanced')"><el-form-item :label="t('model')"><el-input v-model="form.model" class="query-item--w220" :placeholder="health?.model || t('model')" :aria-label="t('model')"/></el-form-item></el-collapse-item></el-collapse></el-form><p class="wb-muted">{{ t('generationConsent') }}</p>
    </div>
    <div class="wb-generation-layout">
      <div class="wb-card">
        <div class="wb-toolbar"><h2>{{ t('jobs') }}</h2><el-button :loading="listing" @click="refresh">{{ t('refresh') }}</el-button></div>
        <el-table :data="jobs" highlight-current-row @row-click="selectJob"><el-table-column :label="$t('portal.application')" show-overflow-tooltip><template #default="{row}">{{ applicationTitle(row) }}</template></el-table-column><el-table-column :label="t('status')"><template #default="{row}"><el-tag :type="tagType(row.status)">{{ status(row.status) }}</el-tag></template></el-table-column></el-table>
      </div>
      <div v-if="job" class="wb-section">
        <div class="wb-card">
          <div class="wb-toolbar"><h2>{{ applicationTitle(job) }}</h2><el-tag :type="tagType(job.status)">{{ status(job.status) }}</el-tag><el-tag v-if="polling" type="info">{{ t('polling') }}</el-tag></div>
          <el-collapse><el-collapse-item :title="$t('portal.originalRequirement')"><p>{{ $t('portal.taskId') }}：{{ job.id }}</p><p class="wb-muted">{{ job.prompt }}</p></el-collapse-item></el-collapse>
          <div class="wb-toolbar"><el-button data-testid="edit-generated-workflow" :disabled="job.status !== 'ready' || session?.role !== 'editor' || actionBusy" @click="editWorkflow">{{ t('editGeneratedWorkflow') }}</el-button><el-button data-testid="deploy-generated-app" type="primary" :disabled="job.status !== 'ready' || deployment?.status === 'running' || actionBusy" @click="deploy">{{ t('deploy') }}</el-button><el-button data-testid="stop-generated-app" type="danger" plain :disabled="deployment?.status !== 'running' || actionBusy" @click="stop">{{ t('stop') }}</el-button><el-button :disabled="!['ready','failed','interrupted'].includes(job.status)" @click="exportSource">{{ t('exportZip') }}</el-button><a v-if="appUrl" data-testid="open-generated-app" class="wb-link" :href="appUrl" target="_blank" rel="noopener noreferrer">{{ t('openApp') }} ↗</a></div>
          <p v-if="job.status === 'ready'" class="wb-muted">{{ t('generatedDraftHint') }}</p>
          <h3>{{ $t('portal.deploymentState') }}</h3><el-tag :type="deployment.status === 'running' ? 'success' : 'info'">{{ $t('portal.' + (['running','stopped','failed'].includes(deployment.status) ? deployment.status : 'notRunning')) }}</el-tag><el-collapse><el-collapse-item :title="$t('portal.technicalDetails')"><pre class="wb-json">{{ json(deployment) }}</pre></el-collapse-item></el-collapse>
        </div>
        <div class="wb-card"><h2>{{ t('stages') }}</h2><el-table :data="job.stages || []"><el-table-column prop="name" :label="t('name')"/><el-table-column :label="t('status')"><template #default="{row}"><el-tag :type="tagType(row.status)">{{ status(row.status) }}</el-tag></template></el-table-column><el-table-column prop="startedAt" :label="t('startedAt')"/><el-table-column prop="finishedAt" :label="t('finishedAt')"/><el-table-column type="expand"><template #default="{row}"><pre class="wb-json" :class="{'wb-error':row.error}">{{ json(row) }}</pre></template></el-table-column></el-table><pre v-if="job.errors?.length" class="wb-json wb-error">{{ json(job.errors) }}</pre></div>
        <div class="wb-card"><h2>{{ t('artifacts') }}</h2><el-table :data="artifactRows"><el-table-column prop="path" :label="t('name')"/><el-table-column prop="bytes" label="Bytes"/><el-table-column prop="sha256" label="SHA-256" show-overflow-tooltip/><el-table-column type="expand"><template #default="{row}"><pre class="wb-json">{{ row.content || json(row) }}</pre></template></el-table-column></el-table><el-empty v-if="!artifactRows.length" :description="t('noArtifacts')"/><el-collapse><el-collapse-item :title="t('usage')"><pre class="wb-json">{{ json(job.usage) }}</pre><pre class="wb-json">{{ json(job.skillUsage) }}</pre><pre class="wb-json">{{ json(job.validation) }}</pre></el-collapse-item></el-collapse></div>
      </div>
      <div v-else class="wb-card"><el-empty :description="t('selectJob')"/></div>
    </div>
  </section>
</template>
<script>
import { wb, exportFile } from '@/api/workbench'
export default {
  name:'WorkbenchGeneration', emits:['edit-workflow'], props:{datasets:{type:Array,default:()=>[]},health:Object,session:Object},
  data(){return{form:{prompt:'',datasetId:'',model:''},jobs:[],job:null,error:'',listing:false,submitting:false,actionBusy:false,polling:false,timer:null,controller:null,selection:0,disposed:false}},
  computed:{
    deployment(){return this.job?.deployment || {}},
    appUrl(){try{const u=new URL(this.deployment.url,location.origin);return ['http:','https:'].includes(u.protocol) && this.deployment.status==='running'?u.href:''}catch{return ''}},
    artifactRows(){const a=this.job?.artifacts;return Array.isArray(a)?a.map(x=>typeof x==='string'?{path:x}:x):Object.entries(a || {}).map(([path,content])=>({path,content:typeof content==='string'?content:JSON.stringify(content,null,2)}))}
  },
  created(){this.refresh()}, beforeUnmount(){this.disposed=true;this.selection++;this.clearPoll();this.controller?.abort()},
  methods:{
    applicationTitle(job){return job.plan?.title || `${this.$t('portal.application')} · ${job.id?.slice(0,8) || ''}`},
    t(k){return this.$t(`workbench.${k}`)},json(v){return JSON.stringify(v ?? {},null,2)},status(s){return this.$te(`workbench.${s}`)?this.t(s):s},
    tagType(s){return ['ready','succeeded','completed'].includes(s)?'success':['failed','error','interrupted'].includes(s)?'danger':s==='running'?'warning':'info'},
    clearPoll(){clearTimeout(this.timer);this.timer=null;this.polling=false},
    async refresh(){this.listing=true;this.error='';try{this.jobs=await wb('/generation') || [];if(this.job)await this.fetchJob(this.job.id,this.selection);else if(this.jobs.length)this.selectJob(this.jobs.find(j=>j.id===this.$route.query.job) || this.jobs[0])}catch(e){if(!this.disposed)this.error=e.message}finally{this.listing=false}},
    selectJob(row){this.selection++;this.clearPoll();this.controller?.abort();this.job={...row};this.fetchJob(row.id,this.selection)},
    async fetchJob(id,seq){if(this.disposed)return;this.controller?.abort();this.controller=new AbortController();try{const data=await wb(`/generation/${encodeURIComponent(id)}`,{signal:this.controller.signal});if(this.disposed||seq!==this.selection)return;this.job=data;const index=this.jobs.findIndex(j=>j.id===id);if(index>=0)this.jobs[index]=data;this.clearPoll();if(!['ready','failed','interrupted'].includes(data.status)||data.deployment?.status==='running'){this.polling=true;this.timer=setTimeout(()=>this.fetchJob(id,seq),1800)}}catch(e){if(this.disposed||seq!==this.selection||this.controller?.signal.aborted)return;this.clearPoll();this.error=`${this.t('pollFailed')}: ${e.message}`}},
    async submit(){if(!this.form.prompt.trim()){this.error=this.t('generateRequired');return}this.submitting=true;this.error='';try{const data={prompt:this.form.prompt.trim()};if(this.form.datasetId)data.datasetId=this.form.datasetId;if(this.form.model.trim())data.model=this.form.model.trim();const task=await wb('/generation',{method:'post',data});this.jobs.unshift(task);this.selectJob(task)}catch(e){this.error=e.message}finally{this.submitting=false}},
    async editWorkflow(){
      if(this.session?.role !== 'editor' || this.job?.status !== 'ready' || this.actionBusy)return
      const id=this.job.id;this.actionBusy=true;this.error=''
      try {
        const task=await wb(`/generation/${encodeURIComponent(id)}`)
        if(this.disposed || this.job?.id !== id)return
        if(task.status !== 'ready')throw new Error(this.t('generatedWorkflowUnavailable'))
        const workflow=task.workflow || task.plan?.workflow
        if(!workflow || !Array.isArray(workflow.nodes) || !workflow.nodes.length || !Array.isArray(workflow.edges))throw new Error(this.t('generatedWorkflowUnavailable'))
        this.$emit('edit-workflow',{taskId:id,title:task.plan?.title || id,workflow:JSON.parse(JSON.stringify(workflow))})
      }catch(e){this.error=e.message}finally{this.actionBusy=false}
    },
    async deploy(){if(!this.job)return;const id=this.job.id;this.actionBusy=true;this.error='';try{const dep=await wb(`/generation/${encodeURIComponent(id)}/deploy`,{method:'post',session:this.session?.token,timeout:120000});if(this.job?.id===id)this.job={...this.job,deployment:dep};await this.fetchJob(id,this.selection)}catch(e){this.error=e.message}finally{this.actionBusy=false}},
    async stop(){if(!this.job)return;const id=this.job.id;this.actionBusy=true;this.error='';try{const dep=await wb(`/generation/${encodeURIComponent(id)}/stop`,{method:'post',session:this.session?.token});if(this.job?.id===id)this.job={...this.job,deployment:dep};await this.fetchJob(id,this.selection)}catch(e){this.error=e.message}finally{this.actionBusy=false}},
    exportSource(){return exportFile(`/generation/${encodeURIComponent(this.job.id)}/export`,{},`guanfeng-${this.job.id}.zip`,this.session?.token)}
  }
}
</script>
<style lang="scss" scoped>
.wb-generation-layout { display: grid; grid-template-columns: 340px minmax(0,1fr); gap: 16px; align-items: start; }
.wb-generation-layout h2 { overflow-wrap: anywhere; }
</style>
