package mz.levesabor.api.dto;

import java.util.List;
import org.springframework.data.domain.Page;

/** BE-A02 · Paginação normalizada dentro de ApiResponse.data (docs/plano/03-backend-plan.md §3.1). */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    public static <T> PageResponse<T> from(Page<T> p) {
        return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }
}
