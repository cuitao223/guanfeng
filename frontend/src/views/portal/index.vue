<template>
  <main class="portal-entry">
    <header class="portal-entry__brand">{{ t('brand') }} <span>GUANFENG</span></header>
    <section class="portal-entry__intro"><p>WEATHER · APPLICATIONS · OBSERVATIONS</p><h1>{{ t('chooseTitle') }}</h1><p>{{ t('chooseIntro') }}</p></section>
    <section class="portal-choice-grid">
      <article v-for="platform in ['cloud','operations']" :key="platform" class="portal-choice">
        <span class="portal-choice__number">{{ platform === 'cloud' ? '01 / CREATE' : '02 / OBSERVE' }}</span><h2>{{ t(platform) }}</h2><p>{{ t(platform + 'Intro') }}</p><p class="portal-choice__features">{{ t(platform + 'Features') }}</p>
        <el-button type="primary" @click="$router.push(platform === 'cloud' ? '/login-cloud' : '/login-network')">{{ t(platform === 'cloud' ? 'enterCloud' : 'enterOperations') }} →</el-button>
      </article>
    </section>
  </main>
</template>
<script>export default { name: 'PortalEntry', methods: { t(key) { return this.$t('portal.' + key) } } }</script>
