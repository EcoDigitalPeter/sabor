package com.ottimizo.stores;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.profile.ClientProfile;
import com.ottimizo.profile.ClientProfileRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoreRankingService {

    private static final int CACHE_HOURS = 12;

    private final ClientProfileRepository profiles;
    private final StoreRepository stores;
    private final StoreRankingCacheRepository cache;
    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public StoreRankingService(
        ClientProfileRepository profiles,
        StoreRepository stores,
        StoreRankingCacheRepository cache,
        ChatClient.Builder chatClientBuilder,
        ObjectMapper objectMapper
    ) {
        this.profiles = profiles;
        this.stores = stores;
        this.cache = cache;
        this.chatClient = chatClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Transactional
    public List<StoreOptionResponse> rankFor(CurrentUser user) {
        ClientProfile profile = profiles.findByUserId(user.id())
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA010_PROFILE_INCOMPLETE));
        String clientAddress = profile.deliveryAddressText();
        if (clientAddress.isBlank()) {
            throw new ServiceException(ErrorCode.LSA010_PROFILE_INCOMPLETE, "Define a morada de entrega antes de escolher a loja.");
        }

        List<Store> activeStores = stores.findByStatus(StoreStatus.ACTIVE);
        String addressHash = sha256(clientAddress);
        OffsetDateTime now = OffsetDateTime.now();

        return cache.findByUserIdAndAddressHashAndExpiresAtAfter(user.id(), addressHash, now)
            .map(StoreRankingCache::ranking)
            .map(ranking -> toResponse(ranking, activeStores))
            .orElseGet(() -> buildAndCache(user.id(), addressHash, clientAddress, activeStores, now));
    }

    private List<StoreOptionResponse> buildAndCache(
        Long userId,
        String addressHash,
        String clientAddress,
        List<Store> activeStores,
        OffsetDateTime now
    ) {
        JsonNode ranking = rankWithAi(clientAddress, activeStores);
        StoreRankingCache entry = cache.findByUserIdAndAddressHash(userId, addressHash)
            .orElseGet(() -> new StoreRankingCache(userId, addressHash, ranking, now.plusHours(CACHE_HOURS)));
        entry.refresh(ranking, now.plusHours(CACHE_HOURS));
        cache.save(entry);
        return toResponse(ranking, activeStores);
    }

    private JsonNode rankWithAi(String clientAddress, List<Store> activeStores) {
        if (activeStores.isEmpty()) {
            return objectMapper.createArrayNode();
        }
        try {
            String answer = chatClient.prompt()
                .system("""
                    Ordena lojas por proximidade provável em Moçambique.
                    Usa apenas os IDs recebidos. Não inventes lojas.
                    Responde só com JSON: [{"storeId":1,"reason":"..."}].
                    """)
                .user("""
                    Morada do cliente: %s

                    Lojas:
                    %s
                    """.formatted(clientAddress, storePrompt(activeStores)))
                .call()
                .content();
            return normalizeRanking(objectMapper.readTree(answer), activeStores);
        } catch (Exception ex) {
            return fallbackRanking(activeStores);
        }
    }

    private String storePrompt(List<Store> activeStores) {
        StringBuilder builder = new StringBuilder();
        for (Store store : activeStores) {
            builder
                .append("- id=").append(store.id())
                .append("; nome=").append(store.name())
                .append("; endereco=").append(store.addressText())
                .append('\n');
        }
        return builder.toString();
    }

    private JsonNode normalizeRanking(JsonNode aiRanking, List<Store> activeStores) {
        Map<Long, Store> byId = byId(activeStores);
        ArrayNode result = objectMapper.createArrayNode();
        if (aiRanking.isArray()) {
            for (JsonNode item : aiRanking) {
                Long storeId = item.path("storeId").isNumber() ? item.path("storeId").asLong() : null;
                if (storeId != null && byId.remove(storeId) != null) {
                    ObjectNode row = result.addObject();
                    row.put("storeId", storeId);
                    row.put("reason", item.path("reason").asText("Mais próxima da morada indicada."));
                }
            }
        }
        byId.values().stream()
            .sorted(Comparator.comparing(Store::name))
            .forEach(store -> addFallback(result, store));
        return result;
    }

    private JsonNode fallbackRanking(List<Store> activeStores) {
        ArrayNode result = objectMapper.createArrayNode();
        activeStores.stream()
            .sorted(Comparator.comparing(Store::name))
            .forEach(store -> addFallback(result, store));
        return result;
    }

    private void addFallback(ArrayNode result, Store store) {
        ObjectNode row = result.addObject();
        row.put("storeId", store.id());
        row.put("reason", "Loja activa disponível para a morada indicada.");
    }

    private List<StoreOptionResponse> toResponse(JsonNode ranking, List<Store> activeStores) {
        Map<Long, Store> byId = byId(activeStores);
        List<StoreOptionResponse> response = new ArrayList<>();
        int rank = 1;
        for (JsonNode item : ranking) {
            Store store = byId.get(item.path("storeId").asLong());
            if (store != null) {
                response.add(new StoreOptionResponse(
                    store.id(),
                    store.name(),
                    store.addressText(),
                    store.deliveryAvailable(),
                    rank++,
                    item.path("reason").asText()
                ));
            }
        }
        return response;
    }

    private Map<Long, Store> byId(List<Store> stores) {
        Map<Long, Store> byId = new LinkedHashMap<>();
        for (Store store : stores) {
            byId.put(store.id(), store);
        }
        return byId;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
