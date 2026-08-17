package com.ottimizo.catalog;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.UserContextService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code PUT /me/recipes/{id}/feedback} (BE-C05, F1-CLI-05) — marcar
 * 👍/👎 numa receita. Rota gated a ROLE_CLIENTE/ROLE_ADMIN em
 * {@code SecurityConfig} ({@code /api/v1/me/**}).
 */
@RestController
@RequestMapping("/api/v1/me/recipes")
public class RecipeFeedbackController {

    private final MealFeedbackService mealFeedbackService;
    private final UserContextService userContext;

    public RecipeFeedbackController(MealFeedbackService mealFeedbackService, UserContextService userContext) {
        this.mealFeedbackService = mealFeedbackService;
        this.userContext = userContext;
    }

    @PutMapping("/{id}/feedback")
    public ApiResponse<Void> setFeedback(
        @PathVariable Long id,
        @Valid @RequestBody FeedbackRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        CurrentUser actor = userContext.currentUser(jwt);
        mealFeedbackService.setFeedback(actor, id, request.value());
        return ApiResponse.success();
    }
}
