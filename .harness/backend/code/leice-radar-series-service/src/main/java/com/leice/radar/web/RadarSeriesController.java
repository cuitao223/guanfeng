package com.leice.radar.web;

import com.leice.radar.series.PpiSeries;
import com.leice.radar.series.RadarSeriesService;
import com.leice.radar.series.RateSeries;
import com.leice.radar.series.ScanProduct;
import com.leice.radar.series.TempHumiditySeries;
import com.leice.radar.series.ThiSeries;
import com.leice.radar.series.WindProfileSeries;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Chart ready radar series. Responses use the platform envelope. */
@RestController
@RequestMapping("/radar/series")
public class RadarSeriesController {

    private static final String LANG_HEADER = "X-Lang";

    private final RadarSeriesService service;
    private final RadarFileResolver resolver;
    private final RadarMessages messages;

    public RadarSeriesController(RadarSeriesService service, RadarFileResolver resolver, RadarMessages messages) {
        this.service = service;
        this.resolver = resolver;
        this.messages = messages;
    }

    @GetMapping("/dbs/wind-profile")
    public ApiResponse<WindProfileSeries> windProfile(
            @RequestParam(name = "file", required = false) String file,
            @RequestHeader(name = LANG_HEADER, required = false) String lang) {
        return ok(service.windProfile(resolver.resolve(file)), lang);
    }

    @GetMapping("/dbs/vertical-wind")
    public ApiResponse<ThiSeries> verticalWind(
            @RequestParam(name = "file", required = false) String file,
            @RequestHeader(name = LANG_HEADER, required = false) String lang) {
        return ok(service.verticalWind(resolver.resolve(file)), lang);
    }

    @GetMapping("/dbs/snr")
    public ApiResponse<ThiSeries> snr(
            @RequestParam(name = "file", required = false) String file,
            @RequestHeader(name = LANG_HEADER, required = false) String lang) {
        return ok(service.snr(resolver.resolve(file)), lang);
    }

    @GetMapping("/dbs/temperature-humidity")
    public ApiResponse<TempHumiditySeries> temperatureHumidity(
            @RequestParam(name = "file", required = false) String file,
            @RequestHeader(name = LANG_HEADER, required = false) String lang) {
        return ok(service.temperatureHumidity(resolver.resolve(file)), lang);
    }

    @GetMapping("/dbs/height-obtain-rate")
    public ApiResponse<RateSeries> heightObtainRate(
            @RequestParam(name = "file", required = false) String file,
            @RequestHeader(name = LANG_HEADER, required = false) String lang) {
        String name = messages.get("radar.rate.heightObtainRate", messages.localeOf(lang));
        return ok(service.heightObtainRate(resolver.resolve(file), name), lang);
    }

    @GetMapping("/ppi/scan")
    public ApiResponse<PpiSeries> scan(
            @RequestParam(name = "file", required = false) String file,
            @RequestParam(name = "product", required = false) String product,
            @RequestHeader(name = LANG_HEADER, required = false) String lang) {
        return ok(service.scan(resolver.resolve(file), ScanProduct.from(product)), lang);
    }

    private <T> ApiResponse<T> ok(T data, String lang) {
        return ApiResponse.ok(data, messages.get("common.success", messages.localeOf(lang)));
    }
}
