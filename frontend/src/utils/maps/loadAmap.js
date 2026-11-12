let pending
export function loadAmap() {
  if(window.AMap?.Map) return Promise.resolve()
  if(pending) return pending
  pending = new Promise((resolve,reject) => {
    const script=document.createElement('script');script.src='/amap/AMap3.js?v=5'
    script.onload=()=>window.AMap?.Map ? resolve() : reject(new Error('Map initialization failed'))
    script.onerror=()=>{pending=null;script.remove();reject(new Error('Map script unavailable'))}
    document.head.appendChild(script)
  })
  return pending
}
