<template><span aria-hidden="true"></span></template>
<script>
import { watch } from 'vue'
import { useLeiceMap3d } from '@leice-map-3d/assets/layers/useLeiceMap3d'
import { displayCoordinates } from '@/utils/maps/coordinates'
import { snapshot, observationMarker, observationPopup } from '@/utils/maps/observations'
import './observations.css'
export default {
  name: 'WeatherObservations3d',
  props: { mode: { type: String, default: 'temperature' }, enabled: { type: Boolean, default: true }, language: { type: String, default: 'Cn' }, translate: { type: Function, required: true } },
  setup(props) {
    useLeiceMap3d(ctx => {
      const AMap = window.AMap
      let markers = []
      const popup = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -20) })
      const clear = () => { popup.close(); markers.forEach(m => { m.off(); m.setMap(null) }); markers = [] }
      const redraw = () => {
        clear()
        if (!props.enabled) return
        markers = snapshot.observations.map(row => {
          const marker = new AMap.Marker({ position: displayCoordinates(row.longitude, row.latitude), content: observationMarker(row, props.mode, props.translate), anchor: 'center', zIndex: 500, title: row.id })
          marker.on('click', () => { popup.setContent(observationPopup(row, props.translate)); popup.open(ctx.map, marker.getPosition()) })
          marker.setMap(ctx.map)
          return marker
        })
      }
      redraw()
      const stop = watch(() => [props.mode, props.enabled, props.language], redraw)
      return () => { stop(); clear() }
    })
  }
}
</script>
