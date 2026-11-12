import { createRouter, createWebHistory } from 'vue-router'
import PlatformLayout from '@/layout/PlatformLayout/index.vue'
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'PortalEntry', component: () => import('@/views/portal/index.vue') },
    { path: '/login', redirect: '/' },
    { path: '/login-cloud', name: 'CloudLogin', meta: { loginPlatform: 'cloud' }, component: () => import('@/views/portal-login/index.vue') },
    { path: '/login-network', name: 'OperationsLogin', meta: { loginPlatform: 'operations' }, component: () => import('@/views/portal-login/index.vue') },
    { path: '/cloud', component: PlatformLayout, meta: { portal: 'cloud' }, children: [
      { path: '', name: 'CloudHome', component: () => import('@/views/cloud-home/index.vue') },
      { path: 'resources', name: 'CloudResources', component: () => import('@/views/resource-center/index.vue') },
      { path: 'resources/charts', name: 'ResourceCharts', meta: { fullBleed:true, referenceKey:'charts' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'resources/maps', name: 'ResourceMaps', meta: { fullBleed:true, referenceKey:'maps' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'resources/ui', name: 'ResourceUi', meta: { fullBleed:true, referenceKey:'ui' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'resources/widgets', name: 'ResourceWidgets', meta: { fullBleed:true, referenceKey:'widgets' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'resources/overview', name: 'ResourceOverview', meta: { fullBleed:true, referenceKey:'overview' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'resources/pages', name: 'ResourcePages', meta: { fullBleed:true, referenceKey:'pages' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'resources/sample', name: 'ResourceSample', meta: { fullBleed:true, referenceKey:'sample' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'workbench', name: 'Workbench', component: () => import('@/views/workbench/index.vue') }
    ] },
    { path: '/operations', component: PlatformLayout, meta: { portal: 'operations' }, children: [
      { path: '', name: 'OperationsOverview', meta: { fullBleed: true }, component: () => import('@/views/operations/index.vue') },
      { path: 'tools', name: 'OperationsTools', component: () => import('@/views/resource-center/index.vue') },
      { path: 'tools/devices', name: 'ToolDevices', meta: { fullBleed:true, referenceKey:'devices' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'tools/multimode', name: 'ToolMultimode', meta: { fullBleed:true, referenceKey:'multimode' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'tools/models', name: 'ToolModels', meta: { fullBleed:true, referenceKey:'models' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'tools/wind-tools', name: 'ToolWindTools', meta: { fullBleed:true, referenceKey:'wind-tools' }, component: () => import('@/views/resource-center/ReferencePage.vue') },
      { path: 'analysis', name: 'OperationsAnalysis', component: () => import('@/views/operations-analysis/index.vue') },
      { path: 'wind', name: 'OperationsWind', meta: { fullBleed: true }, component: () => import('@/views/operations-wind/index.vue') },
      { path: '3d', name: 'OperationsScene', meta: { fullBleed: true }, component: () => import('@/views/operations-scene/index.vue') }
    ] },
    { path: '/developer', component: PlatformLayout, meta: { portal: 'cloud' }, children: [
      { path: 'ui', name: 'UiPreview', component: () => import('@/views/ui-preview/index.vue') },
      { path: 'charts', name: 'Charts', component: () => import('@/views/chart-preview/index.vue') },
      { path: 'maps', name: 'MapWidgets', meta: { fullBleed: true }, component: () => import('@/views/map-preview/index.vue') },
      { path: 'device-overview', name: 'DeviceOverview', meta: { fullBleed: true }, component: () => import('@/views/device-overview/index.vue') },
      { path: 'wind-3d', name: 'Wind3dPage', meta: { fullBleed: true }, component: () => import('@/views/wind-3d/index.vue') },
      { path: 'other-mode', name: 'OtherModePage', meta: { fullBleed: true }, component: () => import('@/views/other-mode/index.vue') },
      { path: 'device-model', name: 'DeviceModel', component: () => import('@/views/device-model/index.vue') }
    ] },
    { path: '/workbench', redirect: to => ({ path: '/cloud/workbench', query: to.query }) },
    { path: '/templates', redirect: '/cloud/resources/pages' },
    { path: '/maps', redirect: '/operations' },
    { path: '/device-overview', redirect: '/operations/tools/devices' },
    { path: '/wind-3d', redirect: '/operations/wind' },
    { path: '/other-mode', redirect: '/operations/tools/multimode' },
    { path: '/ui', redirect: '/developer/ui' },
    { path: '/widgets', redirect: '/cloud/resources/widgets' },
    { path: '/charts', redirect: '/developer/charts' },
    { path: '/overview', redirect: '/operations' },
    { path: '/device-model', redirect: '/operations/tools/models' },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})
export default router
