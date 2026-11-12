package com.leice.radar.error;

/**
 * A failure that is reported to the caller with a business code and a message
 * key. The message is localized by the web layer, not by the domain code.
 */
public class RadarException extends RuntimeException {

    private final int code;
    private final String messageKey;
    private final Object[] arguments;

    protected RadarException(int code, String messageKey, Object... arguments) {
        super(messageKey);
        this.code = code;
        this.messageKey = messageKey;
        this.arguments = arguments == null ? new Object[0] : arguments;
    }

    public static RadarException badRequest(String messageKey, Object... arguments) {
        return new RadarException(400, messageKey, arguments);
    }

    public static RadarException internal(String messageKey, Object... arguments) {
        return new RadarException(500, messageKey, arguments);
    }

    public int getCode() {
        return code;
    }

    public String getMessageKey() {
        return messageKey;
    }

    public Object[] getArguments() {
        return arguments.clone();
    }
}
