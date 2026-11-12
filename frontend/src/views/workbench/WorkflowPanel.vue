<template>
  <section class="wb-section" v-loading="busy && !running">
    <el-alert v-if="error" :title="error" :type="conflict ? 'warning' : 'error'" :closable="false" show-icon/>
    <div class="wb-card">
      <div class="wb-toolbar">
        <el-input v-model="title" :disabled="!canEdit" class="query-item--w220" :aria-label="t('title')" @input="dirty = true"/>
        <el-tag>{{ t('revision') }} {{ revision ?? '—' }}</el-tag>
        <el-tag :type="dirty ? 'warning' : 'info'">{{ t(dirty ? 'unsaved' : 'saved') }}</el-tag>
        <el-button class="manage-toolbar-btn" :disabled="running" @click="loadProject">{{ t('load') }}</el-button>
        <el-button :disabled="!canEdit" @click="newWorkflow">{{ t('new') }}</el-button>
        <el-button :disabled="!canEdit || revision === null" type="primary" data-testid="save-workflow" @click="saveProject">{{ t('save') }}</el-button>
        <el-button :disabled="running || !nodes.length" @click="validate">{{ t('validate') }}</el-button>
        <el-button :disabled="!canEdit || !nodes.length" type="success" data-testid="run-workflow" @click="run">{{ t('run') }}</el-button>
      </div>
      <p v-if="draftSource" class="wb-muted" data-testid="generated-workflow-draft">{{ t('generatedDraftSource') }}: {{ draftSource }} | {{ t('generatedDraftHint') }}</p>
      <p class="wb-muted">{{ t(canEdit ? 'dagHint' : session ? 'readonly' : 'noSession') }}</p>
      <div class="wb-toolbar">
        <el-select v-model="componentKey" :disabled="!canEdit" class="query-item--w220" :placeholder="t('component')"><el-option v-for="c in components.filter(c=>c.enabled !== false)" :key="`${c.id}@${c.version}`" :value="`${c.id}@${c.version}`" :label="`${c.name || c.id} @${c.version}`"/></el-select>
        <el-button :disabled="!canEdit || !componentKey" data-testid="add-node" @click="addNode">{{ t('addNode') }}</el-button>
        <el-select v-model="edgeFrom" :disabled="!canEdit" class="query-item--w180" :placeholder="t('from')"><el-option v-for="n in nodes" :key="n.id" :value="n.id" :label="n.id"/></el-select>
        <el-select v-model="edgeTo" :disabled="!canEdit" class="query-item--w180" :placeholder="t('to')"><el-option v-for="n in nodes" :key="n.id" :value="n.id" :label="n.id"/></el-select>
        <el-button :disabled="!canEdit" @click="connect">{{ t('connect') }}</el-button>
        <el-button :disabled="!canEdit || selectedEdge < 0" type="danger" plain @click="disconnect">{{ t('disconnect') }}</el-button>
      </div>
      <div class="wb-dag-editor">
        <div class="wb-dag-scroll">
          <svg ref="canvas" class="wb-dag" viewBox="0 0 1120 620" role="img" :aria-label="t('workflow')" @pointermove="moveNode" @pointerup="stopDrag" @pointercancel="stopDrag">
            <defs><pattern id="wb-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#263b60"/></pattern><marker id="wb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#75aaff"/></marker></defs>
            <rect width="1120" height="620" fill="url(#wb-dots)"/>
            <g v-for="(edge,i) in edges" :key="`${edge.from}-${edge.to}`" role="button" tabindex="0" :aria-label="`${t('disconnect')}: ${edge.from} → ${edge.to}`" @click="selectedEdge = i" @keydown.enter="selectedEdge = i" @keydown.delete.prevent="selectedEdge=i; disconnect()">
              <path :d="edgePath(edge)" fill="none" stroke="transparent" stroke-width="20"/>
              <path :d="edgePath(edge)" fill="none" :stroke="selectedEdge === i ? '#f7bf65' : '#75aaff'" stroke-width="2" marker-end="url(#wb-arrow)"/>
            </g>
            <g v-for="node in nodes" :key="node.id" :transform="`translate(${position(node).x}, ${position(node).y})`" class="wb-dag-node" role="button" tabindex="0" :aria-label="node.id" @pointerdown="startDrag($event,node)" @keydown.enter="selectNode(node)" @keydown.delete.prevent="selectNode(node); removeNode()">
              <rect width="188" height="84" rx="10" fill="#101d38" :stroke="selectedId === node.id ? '#75aaff' : '#344d78'" stroke-width="2"/>
              <circle cx="0" cy="42" r="5" fill="#75aaff"/><circle cx="188" cy="42" r="5" fill="#75aaff"/>
              <text x="14" y="24" fill="#e2ebff" font-size="14">{{ node.id }}</text>
              <text x="14" y="46" fill="#a7c4fc" font-size="11">{{ node.component }} @{{ node.version }}</text>
              <circle cx="16" cy="65" r="4" :fill="statusColor(nodeState(node.id))"/>
              <text x="28" y="69" fill="#a7c4fc" font-size="11">{{ statusLabel(nodeState(node.id)) }}</text>
            </g>
          </svg>
        </div>
        <div class="wb-node-inspector">
          <h3>{{ t('parameters') }}</h3>
          <template v-if="selectedNode">
            <p>{{ selectedNode.id }} · {{ selectedNode.component }} @{{ selectedNode.version }}</p>
            <el-form label-position="top" @submit.prevent>
              <el-form-item v-if="selectedNode.component === 'reader'" :label="t('dataset')"><el-select :model-value="selectedNode.params?.datasetId" :disabled="!canEdit" @change="setDataset"><el-option v-for="d in datasets" :key="d.id" :value="d.id" :label="d.name || d.id"/></el-select></el-form-item>
              <el-form-item :label="`${t('parameters')} (JSON)`"><el-input v-model="paramsText" type="textarea" :rows="10" :disabled="!canEdit" :aria-label="t('parameters')" @input="paramsDirty = true"/></el-form-item>
              <el-button :disabled="!canEdit" @click="applyParams">{{ t('save') }} {{ t('parameters') }}</el-button>
              <el-button :disabled="!canEdit" type="danger" plain @click="removeNode">{{ t('removeNode') }}</el-button>
            </el-form>
            <el-collapse><el-collapse-item :title="t('schema')"><pre class="wb-json">{{ json(selectedComponent?.parameters || selectedComponent?.inputSchema) }}</pre></el-collapse-item></el-collapse>
          </template><el-empty v-else :description="t('selectNode')"/>
        </div>
      </div>
      <pre v-if="validation" class="wb-json">{{ json(validation) }}</pre>
    </div>
    <div class="wb-card">
      <h2>{{ t('runNodes') }}</h2><el-tag v-if="execution" data-testid="workflow-execution-status" :type="tagType(execution.status)">{{ statusLabel(execution.status) }}</el-tag><p v-if="!execution" class="wb-muted">{{ t('waiting') }}</p>
      <el-table data-testid="workflow-node-statuses" :data="execution?.nodes || []"><el-table-column prop="id" :label="t('nodeId')"/><el-table-column :label="t('status')"><template #default="{row}"><el-tag :type="tagType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column><el-table-column prop="startedAt" :label="t('startedAt')"/><el-table-column prop="finishedAt" :label="t('finishedAt')"/><el-table-column type="expand"><template #default="{row}"><pre class="wb-json">{{ json(row) }}</pre></template></el-table-column></el-table>
      <template v-if="execution?.transitions?.length">
        <h3>{{ t('workflowTransitions') }}</h3>
        <el-table data-testid="workflow-transitions" :data="execution.transitions"><el-table-column prop="sequence" label="#"/><el-table-column prop="nodeId" :label="t('nodeId')"/><el-table-column :label="t('status')"><template #default="{row}">{{ statusLabel(row.status) }}</template></el-table-column><el-table-column prop="at" :label="t('startedAt')"/></el-table>
      </template>
      <el-collapse v-if="execution"><el-collapse-item :title="t('workflowRawResult')"><pre class="wb-json">{{ json(execution) }}</pre></el-collapse-item></el-collapse>
    </div>
    <WorkflowResultPanel v-if="execution" :key="execution.id" :result="execution.result || {}" :session="session"/>
  </section>
</template>
<script>
import { ElMessageBox } from 'element-plus'
import { wb } from '@/api/workbench'
import WorkflowResultPanel from './WorkflowResultPanel.vue'
export default {
  name: 'WorkbenchWorkflow', components: { WorkflowResultPanel }, props: { components: {type:Array,default:()=>[]}, datasets: {type:Array,default:()=>[]}, session: Object, active: Boolean }, emits: ['conflict'],
  data() { return { title: '', revision: null, nodes: [], edges: [], selectedId: '', selectedEdge: -1, componentKey: '', edgeFrom: '', edgeTo: '', paramsText: '{}', paramsDirty: false, dirty: false, draftSource: '', busy: false, error: '', conflict: false, validation: null, execution: null, running: false, runTimer: null, runSequence: 0, runController: null, drag: null, serial: 0, loaded: false } },
  computed: {
    canEdit() { return this.session?.role === 'editor' && !this.running },
    selectedNode() { return this.nodes.find(n=>n.id===this.selectedId) },
    selectedComponent() { return this.components.find(c=>c.id===this.selectedNode?.component && String(c.version)===String(this.selectedNode?.version)) }
  },
  watch: { session(value,previous) { if(value?.token !== previous?.token && this.running){this.runSequence++;this.runController?.abort();this.finishExecution()} if(value && this.active && !this.loaded) this.loadProject() }, active: { immediate: true, handler(value) { if(value && this.session && !this.loaded) this.loadProject() } } },
  beforeUnmount() { this.runSequence++;clearTimeout(this.runTimer);this.runController?.abort() },
  methods: {
    t(k) { return this.$t(`workbench.${k}`) }, json(v) { return JSON.stringify(v ?? {},null,2) },
    statusLabel(s) { const key=`workbench.${s || 'idle'}`; return this.$te(key) ? this.$t(key) : s },
    tagType(s) { return ['success','succeeded','completed'].includes(s)?'success':['error','failed'].includes(s)?'danger':s==='running'?'warning':'info' },
    statusColor(s) { return ['success','succeeded','completed'].includes(s)?'#6fe5b3':['failed','error'].includes(s)?'#ff9292':s==='running'?'#f7bf65':'#7991b8' },
    nodeState(id) { return this.execution?.nodes?.find(n=>n.id===id)?.status || 'idle' },
    position(node) { const index=this.nodes.indexOf(node); return node.position || {x:30+(index%4)*265,y:40+Math.floor(index/4)*150} },
    edgePath(e) { const a=this.nodes.find(n=>n.id===e.from),b=this.nodes.find(n=>n.id===e.to); if(!a||!b)return ''; const p=this.position(a),q=this.position(b); return `M${p.x+188},${p.y+42} C${p.x+245},${p.y+42} ${q.x-60},${q.y+42} ${q.x},${q.y+42}` },
    changed() { this.dirty=true; this.validation=null; this.execution=null; this.conflict=false },
    selectNode(node) { if(this.paramsDirty && !this.applyParams())return; this.selectedId=node.id; this.selectedEdge=-1; this.paramsText=this.json(node.params); this.paramsDirty=false },
    addNode() {
      if(!this.canEdit)return
      const c=this.components.find(c=>`${c.id}@${c.version}`===this.componentKey); if(!c)return
      let id; do{id=`${c.id}_${++this.serial}`}while(this.nodes.some(n=>n.id===id))
      const params={}; const schema=c.parameters?.properties || c.inputSchema?.properties || {}
      Object.entries(schema).forEach(([k,v])=>{if(v.default!==undefined)params[k]=v.default})
      if(c.id==='reader')params.datasetId=this.datasets[0]?.id || ''
      if(c.id==='quality')Object.assign(params,{heightMin:127,heightMax:500,rejectInvalidDirection:true})
      if(c.id==='events')params.threshold=10
      const node={id,component:c.id,version:c.version,params,position:{x:30+(this.nodes.length%4)*265,y:40+(Math.floor(this.nodes.length/4)%4)*140}}
      this.nodes.push(node); this.selectNode(node); this.changed()
    },
    removeNode() { if(!this.canEdit || !this.selectedNode)return; this.nodes=this.nodes.filter(n=>n.id!==this.selectedId); this.edges=this.edges.filter(e=>e.from!==this.selectedId && e.to!==this.selectedId); this.selectedId=''; this.paramsDirty=false; this.selectedEdge=-1; this.changed() },
    connect() { if(!this.canEdit)return; if(!this.edgeFrom||!this.edgeTo||this.edgeFrom===this.edgeTo||this.edges.some(e=>e.from===this.edgeFrom && e.to===this.edgeTo)){this.error=this.t('invalidEdge');return} this.edges.push({from:this.edgeFrom,to:this.edgeTo}); this.error=''; this.changed() },
    disconnect() { if(!this.canEdit || this.selectedEdge<0)return; this.edges.splice(this.selectedEdge,1); this.selectedEdge=-1; this.changed() },
    applyParams() { if(!this.canEdit)return !this.paramsDirty; try { const data=JSON.parse(this.paramsText); if(!data||Array.isArray(data)||typeof data!=='object')throw Error(); if(this.selectedNode)this.selectedNode.params=data; if(this.paramsDirty)this.changed(); this.paramsDirty=false; this.error=''; return true } catch { this.error=this.t('invalidJson'); return false } },
    setDataset(value) { if(!this.applyParams())return; this.selectedNode.params.datasetId=value; this.paramsText=this.json(this.selectedNode.params); this.changed() },
    startDrag(event,node) { this.selectNode(node); if(!this.canEdit || event.button!==0)return; const p=this.svgPoint(event),pos=this.position(node); this.drag={id:node.id,dx:p.x-pos.x,dy:p.y-pos.y}; this.$refs.canvas.setPointerCapture(event.pointerId); event.preventDefault() },
    svgPoint(event) { const pt=this.$refs.canvas.createSVGPoint(); pt.x=event.clientX;pt.y=event.clientY; return pt.matrixTransform(this.$refs.canvas.getScreenCTM().inverse()) },
    moveNode(event) { if(!this.drag || !this.canEdit)return; const n=this.nodes.find(n=>n.id===this.drag.id),p=this.svgPoint(event); n.position={x:Math.max(5,Math.min(927,p.x-this.drag.dx)),y:Math.max(5,Math.min(531,p.y-this.drag.dy))}; this.changed() },
    stopDrag() { this.drag=null },
    workflowData() { return {nodes:JSON.parse(JSON.stringify(this.nodes)),edges:JSON.parse(JSON.stringify(this.edges))} },
    async importGeneratedDraft(payload) {
      if(!this.canEdit || this.busy)throw new Error(this.t('generatedWorkflowEditorRequired'))
      const workflow=JSON.parse(JSON.stringify(payload.workflow))
      this.busy=true;this.error=''
      try {
        await wb('/workflow/validate',{method:'post',session:this.session.token,data:workflow})
        if(this.dirty || this.paramsDirty){
          try{await ElMessageBox.confirm(this.t('importGeneratedConfirm'),this.t('editGeneratedWorkflow'),{confirmButtonText:this.t('confirm'),cancelButtonText:this.t('cancel')})}catch{return false}
        }
        if(!this.canEdit)throw new Error(this.t('generatedWorkflowEditorRequired'))
        const project=await wb('/projects/demo',{session:this.session.token})
        this.revision=project.revision;this.title=payload.title || project.title || ''
        this.nodes=workflow.nodes;this.edges=workflow.edges;this.selectedId='';this.selectedEdge=-1;this.paramsText='{}';this.paramsDirty=false
        this.loaded=true;this.draftSource=payload.taskId;this.changed()
        return true
      }catch(e){this.error=e.message;throw e}finally{this.busy=false}
    },
    async loadProject() {
      if(!this.session){this.error=this.t('noSession');return}
      if(this.dirty || this.paramsDirty) { try{await ElMessageBox.confirm(this.t('loadConfirm'),this.t('load'),{confirmButtonText:this.t('confirm'),cancelButtonText:this.t('cancel')})}catch{return} }
      this.busy=true;this.error=''
      try { const p=await wb('/projects/demo',{session:this.session?.token}); this.title=p.title || '';this.revision=p.revision;this.nodes=p.workflow?.nodes || [];this.edges=p.workflow?.edges || [];this.selectedId='';this.paramsDirty=false;this.dirty=false;this.loaded=true;this.draftSource='';this.conflict=false;this.execution=null }catch(e){this.error=e.message}finally{this.busy=false}
    },
    async newWorkflow() { if(!this.canEdit)return; if(this.dirty||this.paramsDirty){try{await ElMessageBox.confirm(this.t('loadConfirm'),this.t('new'),{confirmButtonText:this.t('confirm'),cancelButtonText:this.t('cancel')})}catch{return}} this.nodes=[];this.edges=[];this.draftSource='';this.selectedId='';this.paramsDirty=false;this.changed() },
    async saveProject() {
      if(!this.canEdit || !this.applyParams())return;this.busy=true;this.error=''
      try { const p=await wb('/projects/demo',{method:'put',session:this.session.token,data:{revision:this.revision,title:this.title,workflow:this.workflowData()}}); this.revision=p.revision;this.dirty=false;this.conflict=false }catch(e){this.conflict=e.code===409;this.error=this.conflict?this.t('conflict'):e.message; if(this.conflict)this.$emit('conflict')}finally{this.busy=false}
    },
    async validate() { if(!this.applyParams() || !this.nodes.length)return;this.busy=true;this.error='';try{this.validation=await wb('/workflow/validate',{method:'post',session:this.session?.token,data:this.workflowData()})}catch(e){this.error=e.message}finally{this.busy=false} },
    finishExecution() { this.running=false;this.busy=false;clearTimeout(this.runTimer);this.runTimer=null },
    terminalExecution(status) { return ['succeeded','completed','failed','interrupted','cancelled','canceled'].includes(status) },
    async pollExecution(id,sequence) {
      if(sequence !== this.runSequence)return
      try {
        const result=await wb(`/workflow/jobs/${encodeURIComponent(id)}`,{session:this.session?.token,signal:this.runController.signal})
        if(sequence !== this.runSequence)return
        this.execution=result
        if(this.terminalExecution(result.status)){this.finishExecution();return}
        this.runTimer=setTimeout(()=>this.pollExecution(id,sequence),200)
      }catch(e){if(sequence !== this.runSequence)return;this.error=e.message;this.finishExecution()}
    },
    async run() {
      if(!this.canEdit || !this.applyParams() || !this.nodes.length)return
      this.busy=true;this.running=true;this.error='';this.execution=null
      const sequence=++this.runSequence;this.runController?.abort();this.runController=new AbortController()
      try {
        const job=await wb('/workflow/jobs',{method:'post',session:this.session.token,data:this.workflowData(),signal:this.runController.signal,timeout:30000})
        if(sequence !== this.runSequence)return
        if(!job.id)throw new Error(this.t('workflowJobMissing'))
        this.execution=job
        if(this.terminalExecution(job.status)){this.finishExecution();return}
        await this.pollExecution(job.id,sequence)
      }catch(e){if(sequence !== this.runSequence)return;this.error=e.message;if(e.details?.nodes)this.execution=e.details;this.finishExecution()}
    }
  }
}
</script>
<style lang="scss" scoped>
.wb-dag-editor { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; }
.wb-dag-scroll { overflow: auto; border: 1px solid #263b60; border-radius: 10px; background: #0b162c; }
.wb-dag { width: 100%; min-width: 720px; min-height: 400px; display: block; touch-action: none; }
.wb-dag-node { cursor: grab; outline: none; }
.wb-dag-node:focus rect { stroke: #f7bf65; }
.wb-node-inspector { padding: 16px; background: #101d38; border-radius: 10px; overflow: auto; }
.wb-node-inspector p { overflow-wrap: anywhere; }
</style>
