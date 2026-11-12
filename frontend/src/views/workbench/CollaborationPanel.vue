<template>
  <section class="wb-section" v-loading="busy">
    <el-alert v-if="error" :title="error" :type="conflict ? 'warning' : 'error'" :closable="false" show-icon/>
    <div class="wb-two">
      <div class="wb-card">
        <h2>{{ t('session') }}</h2>
        <template v-if="!session">
          <el-form :model="form" label-position="top" class="wb-session-form" @submit.prevent="join">
            <el-form-item :label="t('sessionName')"><el-input v-model="form.name" maxlength="60" :aria-label="t('sessionName')"/></el-form-item>
            <el-form-item :label="t('role')"><el-radio-group v-model="form.role"><el-radio value="editor">{{ t('editor') }}</el-radio><el-radio value="viewer">{{ t('viewer') }}</el-radio></el-radio-group></el-form-item>
            <el-form-item :label="t('invite')"><el-input v-model="form.invite" :aria-label="t('invite')"/></el-form-item>
            <el-button type="primary" native-type="submit" data-testid="join-session">{{ t('createSession') }}</el-button>
          </el-form>
          <p class="wb-muted">{{ t('sessionPolicy') }}</p>
        </template>
        <template v-else><p>{{ session.name }} · {{ t(session.role) }}</p><el-tag :type="session.role==='editor'?'success':'info'">{{ t(session.role==='editor'?'editor':'readonly') }}</el-tag><el-button @click="leave">{{ t('leave') }}</el-button></template>
        <p class="wb-muted">{{ t('inviteHint') }}</p>
      </div>
      <div class="wb-card">
        <h2>{{ t('invite') }}</h2>
        <div class="wb-toolbar"><el-radio-group v-model="inviteRole" :disabled="!canEdit"><el-radio value="editor">{{ t('editor') }}</el-radio><el-radio value="viewer">{{ t('viewer') }}</el-radio></el-radio-group><el-button :disabled="!canEdit" type="primary" @click="invite">{{ t('createInvite') }}</el-button></div>
        <el-input v-if="inviteCode" :model-value="inviteCode" readonly :aria-label="t('invite')"/><el-button v-if="inviteCode" @click="copyInvite">{{ t(copied ? 'copied':'copy') }}</el-button>
        <p v-if="!canEdit" class="wb-muted">{{ t('noSession') }}</p>
      </div>
    </div>
    <div class="wb-card">
      <div class="wb-toolbar"><h2>{{ t('project') }}</h2><el-tag v-if="project">{{ t('revision') }} {{ project.revision }}</el-tag><el-button :disabled="!session" @click="load">{{ t('refresh') }}</el-button><el-button :disabled="!project" @click="$emit('load')">{{ t('load') }} DAG</el-button></div>
      <template v-if="project"><h3>{{ project.title }}</h3><p class="wb-muted">{{ t('author') }}: {{ project.updatedBy }}</p><h3>{{ t('history') }}</h3><el-table :data="history" stripe><el-table-column prop="revision" :label="t('revision')"/><el-table-column prop="author" :label="t('author')"/><el-table-column prop="time" :label="t('time')"/><el-table-column prop="title" :label="t('title')"/></el-table></template>
      <el-empty v-else :description="t(session ? 'empty':'noSession')"/>
    </div>
    <div v-if="project" class="wb-two">
      <div class="wb-card"><h2>{{ t('diff') }}</h2><div class="wb-toolbar"><el-select v-model="from" class="query-item--w140" :placeholder="t('from')"><el-option v-for="h in history" :key="h.revision" :value="h.revision" :label="String(h.revision)"/></el-select><span>→</span><el-select v-model="to" class="query-item--w140" :placeholder="t('to')"><el-option v-for="h in history" :key="h.revision" :value="h.revision" :label="String(h.revision)"/></el-select><el-button :disabled="from===null || to===null" @click="diff">{{ t('diff') }}</el-button></div><template v-if="difference"><pre v-for="(change,i) in difference.changes" :key="i" class="wb-json">{{ json(change) }}</pre><p v-if="!difference.changes?.length" class="wb-muted">{{ t('noChanges') }}</p></template></div>
      <div class="wb-card"><h2>{{ t('rollback') }}</h2><div class="wb-toolbar"><el-select v-model="targetRevision" class="query-item--w180" :disabled="!canEdit" :placeholder="t('targetRevision')"><el-option v-for="h in history" :key="h.revision" :value="h.revision" :label="String(h.revision)"/></el-select><el-button :disabled="!canEdit || targetRevision===null" type="danger" plain @click="rollback">{{ t('rollback') }}</el-button></div><p class="wb-muted">{{ t('rollbackConfirm') }}</p></div>
    </div>
  </section>
</template>
<script>
import { ElMessageBox } from 'element-plus'
import usePortalStore from '@/store/modules/portal'
import { wb } from '@/api/workbench'
export default {
  name:'WorkbenchCollaboration', props:{session:Object}, emits:['session','load'],
  data(){return{form:{name:'',role:'editor',invite:''},project:null,inviteRole:'editor',inviteCode:'',copied:false,from:null,to:null,targetRevision:null,difference:null,busy:false,error:'',conflict:false}},
  computed:{canEdit(){return this.session?.role==='editor'},history(){return [...(this.project?.history || [])].reverse()}},
  created(){this.form.name=usePortalStore().cloud?.displayName || '';if(this.session)this.load()},
  methods:{
    t(k){return this.$t(`workbench.${k}`)},json(v){return JSON.stringify(v,null,2)},
    async join(){if(!this.form.name.trim()){this.error=this.t('sessionRequired');return}this.busy=true;this.error='';try{const session=await wb('/session',{method:'post',data:{...this.form,name:this.form.name.trim()}});this.form.invite='';this.$emit('session',session);await this.$nextTick();await this.load()}catch(e){this.error=e.message}finally{this.busy=false}},
    async leave(){this.busy=true;this.error='';try{await wb('/session/leave',{method:'post',session:this.session?.token,data:{}});this.$emit('session',null);this.project=null;this.inviteCode='';this.difference=null}catch(e){this.error=e.message}finally{this.busy=false}},
    async load(){if(!this.session)return;this.busy=true;this.error='';try{this.project=await wb('/projects/demo',{session:this.session.token});this.to=this.project.revision;if(this.from===null)this.from=this.project.history?.[0]?.revision ?? this.project.revision;this.conflict=false}catch(e){this.error=e.message}finally{this.busy=false}},
    async invite(){if(!this.canEdit)return;this.busy=true;this.error='';try{const r=await wb('/projects/demo/invite',{method:'post',session:this.session.token,data:{role:this.inviteRole}});this.inviteCode=r.invite;this.copied=false}catch(e){this.error=e.message}finally{this.busy=false}},
    async copyInvite(){try{await navigator.clipboard.writeText(this.inviteCode);this.copied=true}catch{this.copied=false}},
    async diff(){if(!this.session)return;this.busy=true;this.error='';try{this.difference=await wb('/projects/demo/diff',{session:this.session.token,params:{from:this.from,to:this.to}})}catch(e){this.error=e.message}finally{this.busy=false}},
    async rollback(){if(!this.canEdit)return;try{await ElMessageBox.confirm(this.t('rollbackConfirm'),this.t('rollback'),{confirmButtonText:this.t('confirm'),cancelButtonText:this.t('cancel')})}catch{return}this.busy=true;this.error='';try{this.project=await wb('/projects/demo/rollback',{method:'post',session:this.session.token,data:{revision:this.project.revision,targetRevision:this.targetRevision}});this.to=this.project.revision;this.difference=null}catch(e){this.conflict=e.code===409;this.error=this.conflict?this.t('conflict'):e.message}finally{this.busy=false}}
  }
}
</script>
