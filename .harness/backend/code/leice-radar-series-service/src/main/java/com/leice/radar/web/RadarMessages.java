package com.leice.radar.web;

import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Resolves localized messages from the {@code X-Lang} request header.
 *
 * <p>The component owns this message source privately instead of publishing a
 * {@code MessageSource} bean, so a host application keeps its own
 * internationalization configuration.</p>
 */
@Component
public class RadarMessages {

    private final ReloadableResourceBundleMessageSource messages = new ReloadableResourceBundleMessageSource();

    public RadarMessages() {
        messages.setBasename("classpath:i18n/messages");
        messages.setDefaultEncoding("UTF-8");
        messages.setFallbackToSystemLocale(false);
    }

    public String get(String key, Locale locale, Object... arguments) {
        return messages.getMessage(key, arguments, key, locale);
    }

    /** {@code Cn} selects Chinese; anything else, including missing, selects English. */
    public Locale localeOf(String xLang) {
        if (xLang != null && xLang.equalsIgnoreCase("Cn")) {
            return Locale.SIMPLIFIED_CHINESE;
        }
        return Locale.ENGLISH;
    }
}
