package com.ottimizo.stores;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.security.UserContextService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stores")
public class StoreController {

    private final StoreRankingService ranking;
    private final UserContextService userContext;

    public StoreController(StoreRankingService ranking, UserContextService userContext) {
        this.ranking = ranking;
        this.userContext = userContext;
    }

    @GetMapping
    public ApiResponse<List<StoreOptionResponse>> list(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.success(ranking.rankFor(userContext.currentUser(jwt)));
    }
}
