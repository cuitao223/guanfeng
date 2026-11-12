<template><span class="weather-observation-layer" aria-hidden="true"></span></template>
<script>
import L from 'leaflet'
import { watch } from 'vue'
import { useLeiceMap } from '@leice-map-2d/assets/layers/useLeiceMap'
import { displayCoordinates } from '@/utils/maps/coordinates'
import { snapshot, observationMarker, observationPopup } from '@/utils/maps/observations'
import './observations.css'
export default {
  name: 'WeatherObservations',
  emits: ['select'],
  props: { selectedId: { type: String, default: '' }, mode: { type: String, default: 'temperature' }, enabled: { type: Boolean, default: true }, gcj: { type: Boolean, default: true }, language: { type: String, default: 'Cn' }, translate: { type: Function, required: true } },
  setup(props, { emit }) {
    useLeiceMap(map => {
      const group = L.layerGroup().addTo(map)
      const stations = new Map()
      const redraw = () => {
        group.clearLayers()
        stations.clear()
        if (!props.enabled) return
        snapshot.observations.forEach(row => {
          const [lng, lat] = displayCoordinates(row.longitude, row.latitude, props.gcj)
          const marker = L.marker([lat,lng], { title: row.id, keyboard: true, icon: L.divIcon({ className: 'weather-observation-icon', html: observationMarker(row, props.mode, props.translate), iconSize: [76,38], iconAnchor: [38,19] }) }).bindPopup(() => observationPopup(row, props.translate), { maxWidth: 340 }).addTo(group)
          marker.on('click', () => emit('select', row.id))
          stations.set(row.id, marker)
        })
      }
      const stopSelection = watch(() => props.selectedId, id => {
        const marker = stations.get(id)
        if(marker) { map.setView(marker.getLatLng(), Math.max(map.getZoom(), 7)); marker.openPopup() }
      })
      redraw()
      const stop = watch(() => [props.mode, props.enabled, props.gcj, props.language], redraw)
      return () => { stop(); stopSelection(); group.remove() }
    })
  }
}
</script>
