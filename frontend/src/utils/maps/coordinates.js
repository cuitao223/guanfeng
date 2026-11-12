// WGS84 -> GCJ02 formula adapted from wandergis/coordtransform (MIT).
// Original copyright and full MIT notice: coordtransform-LICENSE.txt.
export function displayCoordinates(lng, lat, gcj = true) {
  if (!gcj || lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lng, lat]
  const pi = Math.PI, x = lng - 105, y = lat - 35
  let dLat = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x))
  dLat += (20*Math.sin(6*x*pi) + 20*Math.sin(2*x*pi))*2/3
  dLat += (20*Math.sin(y*pi) + 40*Math.sin(y/3*pi))*2/3
  dLat += (160*Math.sin(y/12*pi) + 320*Math.sin(y*pi/30))*2/3
  let dLng = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x))
  dLng += (20*Math.sin(6*x*pi) + 20*Math.sin(2*x*pi))*2/3
  dLng += (20*Math.sin(x*pi) + 40*Math.sin(x/3*pi))*2/3
  dLng += (150*Math.sin(x/12*pi) + 300*Math.sin(x/30*pi))*2/3
  const radLat = lat/180*pi, magic = 1 - 0.00669342162296594323*Math.sin(radLat)**2, sqrtMagic = Math.sqrt(magic)
  dLat = dLat*180/((6378245*(1-0.00669342162296594323))/(magic*sqrtMagic)*pi)
  dLng = dLng*180/(6378245/sqrtMagic*Math.cos(radLat)*pi)
  return [lng + dLng, lat + dLat]
}
