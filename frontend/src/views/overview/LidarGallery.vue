<template>
  <div class="lidar-gallery">
    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.profile') }}</strong>
        <code>ProfileChart</code>
      </header>
      <div class="lidar-card__plot">
        <profile-chart
          :title="$t('widget.gallery.profile')"
          :unit="profileSample.unit"
          :height-arr="profileSample.heightArr"
          :value="profileSample.value"
          :height-max="profileSample.heightMax"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.barbThi') }}</strong>
        <code>BarbThiChart</code>
      </header>
      <div class="lidar-card__plot">
        <barb-thi-chart
          :title="$t('widget.gallery.barbThi')"
          :times="barbThiSample.times"
          :height-arr="barbThiSample.heightArr"
          :values="barbThiSample.values"
          :dirs="barbThiSample.dirs"
          :unit="barbThiSample.unit"
          :theme="theme"
          color-mode="threshold"
          :breakpoints="barbThiSample.breakpoints"
          :colors="barbThiSample.colors"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.thi') }}</strong>
        <code>ThiChart</code>
      </header>
      <div class="lidar-card__plot">
        <thi-chart
          :times="thiSample.times"
          :height-arr="thiSample.heightArr"
          :values="thiSample.values"
          :windpara="thiSample.windpara"
          :unit="thiSample.unit"
          :breakpoints="thiSample.breakpoints"
          :colors="thiSample.colors"
          color-mode="threshold"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.scanPpi') }}</strong>
        <code>ScanChart</code>
      </header>
      <div class="lidar-card__plot">
        <scan-chart
          mode="ppi"
          :title="$t('widget.gallery.scanPpi')"
          :angles="scanSample.ppi.angles"
          :height-arr="scanSample.ppi.ranges"
          :values="scanSample.ppi.values"
          :max-range="scanSample.maxRange"
          :unit="scanSample.unit"
          :theme="theme"
          color-mode="threshold"
          :breakpoints="scanSample.breakpoints"
          :colors="scanSample.colors"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.scanRhi') }}</strong>
        <code>ScanChart</code>
      </header>
      <div class="lidar-card__plot">
        <scan-chart
          mode="rhi"
          :title="$t('widget.gallery.scanRhi')"
          :angles="scanSample.rhi.angles"
          :height-arr="scanSample.rhi.ranges"
          :values="scanSample.rhi.values"
          :max-range="scanSample.maxRange"
          :unit="scanSample.unit"
          :theme="theme"
          color-mode="threshold"
          :breakpoints="scanSample.breakpoints"
          :colors="scanSample.colors"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.profileCompare') }}</strong>
        <code>CompareProfileChart</code>
      </header>
      <div class="lidar-card__plot">
        <compare-profile-chart
          :title="$t('widget.gallery.profileCompare')"
          :unit="profileCompareSample.unit"
          :series="profileCompareSample.series"
          :height-max="profileCompareSample.heightMax"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.barbProfile') }}</strong>
        <code>BarbProfileChart</code>
      </header>
      <div class="lidar-card__plot">
        <barb-profile-chart
          :title="$t('widget.gallery.barbProfile')"
          :height-arr="barbProfileSample.heightArr"
          :value="barbProfileSample.value"
          :dir-arr="barbProfileSample.dirArr"
          :height-max="barbProfileSample.heightMax"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.thiSequence') }}</strong>
        <code>ThiSequenceChart</code>
      </header>
      <div class="lidar-card__plot">
        <thi-sequence-chart
          :time-start="thiSequenceSample.timeStart"
          :time-end="thiSequenceSample.timeEnd"
          :height-max="thiSequenceSample.heightMax"
          :layers="thiSequenceSample.layers"
          :wind-density="thiSequenceSample.windDensity"
          :wind-barb-scale="thiSequenceSample.windBarbScale"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.hodograph') }}</strong>
        <code>HodographChart</code>
      </header>
      <div class="lidar-card__plot">
        <hodograph-chart :layers="hodographSample" :theme="theme" />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.soundingBarb') }}</strong>
        <code>SoundingBarbChart</code>
      </header>
      <div class="lidar-card__plot">
        <sounding-barb-chart
          :pressure="soundingSample.pressure"
          :value="soundingSample.value"
          :wind-dir="soundingSample.windDir"
          :height="soundingSample.height"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.skewT') }}</strong>
        <code>SkewTChart</code>
      </header>
      <div class="lidar-card__plot">
        <skew-t-chart
          :temperature="skewTSample.temperature"
          :dew-point="skewTSample.dewPoint"
          :state-curve="skewTSample.stateCurve"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.windRose') }}</strong>
        <code>WindRoseCo2Chart</code>
      </header>
      <div class="lidar-card__plot">
        <wind-rose-co2-chart
          :samples="windRoseSample.samples"
          :max-value="windRoseSample.maxValue"
          :height-m="windRoseSample.heightM"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card">
      <header>
        <strong>{{ $t('widget.gallery.flux') }}</strong>
        <code>FluxCo2Chart</code>
      </header>
      <div class="lidar-card__plot">
        <flux-co2-chart
          :time-arr="fluxSample.timeArr"
          :values="fluxSample.values"
          direction="vertical"
          unit="mass"
          :theme="theme"
        />
      </div>
    </article>

    <article class="lidar-card lidar-card--wide">
      <header>
        <strong>{{ $t('widget.gallery.fluxCalendar') }}</strong>
        <code>FluxCalendarChart</code>
      </header>
      <div class="lidar-card__plot lidar-card__plot--calendar">
        <flux-calendar-chart
          :rows="fluxCalendarSample.rows"
          :years="fluxCalendarSample.years"
          :field="fluxCalendarSample.field"
          :mode="fluxCalendarSample.mode"
          :unit="fluxCalendarSample.unit"
          theme="light"
        />
      </div>
    </article>
  </div>
</template>

<script>
import { ProfileChart } from '@leice-charts/profile/assets/src'
import { BarbThiChart } from '@leice-charts/barb-thi/assets/src'
import { ThiChart } from '@leice-charts/thi/assets/src'
import { ScanChart } from '@leice-charts/scan/assets/src'
import { CompareProfileChart } from '@leice-charts/profile-compare/assets/src'
import { BarbProfileChart } from '@leice-charts/barb-profile/assets/src'
import { ThiSequenceChart } from '@leice-charts/thi-sequence/assets/src'
import { HodographChart } from '@leice-charts/hodograph/assets/src'
import { SoundingBarbChart } from '@leice-charts/sounding-barb/assets/src'
import { SkewTChart } from '@leice-charts/skew-t/assets/src'
import { WindRoseCo2Chart } from '@leice-charts/wind-rose-co2/assets/src'
import { FluxCo2Chart } from '@leice-charts/flux-co2/assets/src'
import { FluxCalendarChart } from '@leice-charts/flux-calendar-co2/assets/src'
import {
  barbProfileSample,
  barbThiSample,
  fluxCalendarSample,
  fluxSample,
  hodographSample,
  lidarTheme,
  profileCompareSample,
  profileSample,
  scanSample,
  skewTSample,
  soundingSample,
  thiSample,
  thiSequenceSample,
  windRoseSample
} from './lidarSamples'

export default {
  name: 'LidarGallery',
  components: {
    ProfileChart,
    BarbThiChart,
    ThiChart,
    ScanChart,
    CompareProfileChart,
    BarbProfileChart,
    ThiSequenceChart,
    HodographChart,
    SoundingBarbChart,
    SkewTChart,
    WindRoseCo2Chart,
    FluxCo2Chart,
    FluxCalendarChart
  },
  data() {
    return {
      theme: lidarTheme,
      profileSample,
      barbThiSample,
      thiSample,
      scanSample,
      profileCompareSample,
      barbProfileSample,
      thiSequenceSample,
      hodographSample,
      soundingSample,
      skewTSample,
      windRoseSample,
      fluxSample,
      fluxCalendarSample
    }
  }
}
</script>

<style lang="scss" scoped>
.lidar-gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 1400px) {
  .lidar-gallery {
    grid-template-columns: 1fr 1fr;
  }
}
.lidar-card {
  overflow: hidden;
  border-radius: 10px;
  background: #061830;
}
.lidar-card--wide {
  grid-column: 1 / -1;
  background: #fff;
}
.lidar-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  color: #d7ecff;
  font-size: 14px;
}
.lidar-card--wide header {
  color: #171717;
}
.lidar-card code {
  color: #8aa0b8;
  font-size: 12px;
}
.lidar-card--wide code {
  color: #666;
}
.lidar-card__plot {
  height: 56vh;
  min-height: 720px;
}
.lidar-card__plot :deep(.thi-chart),
.lidar-card__plot :deep(.barb-chart),
.lidar-card__plot :deep(.scan-chart),
.lidar-card__plot :deep(.profile-chart),
.lidar-card__plot :deep(.compare-chart),
.lidar-card__plot :deep(.barb-profile),
.lidar-card__plot :deep(.thi-sequence),
.lidar-card__plot :deep(.hodograph),
.lidar-card__plot :deep(.chart-frame),
.lidar-card__plot :deep(.skewt-chart),
.lidar-card__plot :deep(.flux-calendar) {
  width: 100%;
  height: 100%;
}
.lidar-card__plot--calendar {
  height: 70vh;
  min-height: 880px;
  padding: 8px 12px 12px;
  background: #fff;
}
</style>
