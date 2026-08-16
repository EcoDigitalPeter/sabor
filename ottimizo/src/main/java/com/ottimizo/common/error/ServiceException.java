package com.ottimizo.common.error;

public class ServiceException extends RuntimeException {

    private final ErrorCode code;

    public ServiceException(ErrorCode code) {
        this(code, code.defaultMessage());
    }

    public ServiceException(ErrorCode code, String message) {
        super(message);
        this.code = code;
    }

    public ErrorCode code() {
        return code;
    }
}
