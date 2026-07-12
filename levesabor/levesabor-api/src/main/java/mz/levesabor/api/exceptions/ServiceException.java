package mz.levesabor.api.exceptions;

import lombok.Getter;

/** BE-A02 · Exceção de negócio — lançada pelos services, traduzida pelo GlobalExceptionHandler. */
@Getter
public class ServiceException extends RuntimeException {

    private final ErrorCodes code;

    public ServiceException(ErrorCodes code, Object... args) {
        super(code.getMessage(args));
        this.code = code;
    }
}
