package com.ottimizo.stores;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import com.ottimizo.profile.ClientProfile;
import com.ottimizo.profile.ClientProfileRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class StoreRankingServiceTest {

    @Mock
    private ClientProfileRepository profiles;
    @Mock
    private StoreRepository stores;
    @Mock
    private StoreRankingCacheRepository cache;
    @Mock
    private ChatClient.Builder chatClientBuilder;
    @Mock
    private ChatClient chatClient;
    @Mock
    private ChatClient.ChatClientRequestSpec requestSpec;
    @Mock
    private ChatClient.CallResponseSpec callResponseSpec;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private StoreRankingService service;

    private static final Long USER_ID = 42L;

    @BeforeEach
    void setUp() {
        when(chatClientBuilder.build()).thenReturn(chatClient);
        service = new StoreRankingService(profiles, stores, cache, chatClientBuilder, objectMapper);
    }

    @Test
    void rankFor_throwsProfileIncomplete_whenNoProfile() {
        CurrentUser user = currentUser();
        when(profiles.findByUserId(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rankFor(user))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA010_PROFILE_INCOMPLETE);
    }

    @Test
    void rankFor_throwsProfileIncomplete_whenDeliveryAddressBlank() {
        CurrentUser user = currentUser();
        ClientProfile profile = profileWithAddress(null, null, null, null);
        when(profiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> service.rankFor(user))
            .isInstanceOf(ServiceException.class)
            .hasMessageContaining("morada de entrega");
    }

    @Test
    void rankFor_usesCachedRanking_andNeverCallsAi() {
        CurrentUser user = currentUser();
        ClientProfile profile = profileWithAddress("Maputo", "Maputo", "Polana", "Rua 1");
        when(profiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));

        Store storeOne = store(1L, "Loja A", true);
        when(stores.findByStatus(StoreStatus.ACTIVE)).thenReturn(List.of(storeOne));

        ArrayNode cachedRanking = objectMapper.createArrayNode();
        ObjectNode row = cachedRanking.addObject();
        row.put("storeId", 1L);
        row.put("reason", "Perto de ti.");
        StoreRankingCache cacheEntry = new StoreRankingCache(USER_ID, "hash", cachedRanking, OffsetDateTime.now().plusHours(1));

        when(cache.findByUserIdAndAddressHashAndExpiresAtAfter(eq(USER_ID), anyString(), any(OffsetDateTime.class)))
            .thenReturn(Optional.of(cacheEntry));

        List<StoreOptionResponse> result = service.rankFor(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).reason()).isEqualTo("Perto de ti.");
        assertThat(result.get(0).rank()).isEqualTo(1);
        verify(chatClient, never()).prompt();
        verify(cache, never()).save(any());
    }

    @Test
    void rankFor_noActiveStores_returnsEmptyListWithoutCallingAi() {
        CurrentUser user = currentUser();
        ClientProfile profile = profileWithAddress("Maputo", "Maputo", "Polana", "Rua 1");
        when(profiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));
        when(stores.findByStatus(StoreStatus.ACTIVE)).thenReturn(List.of());
        when(cache.findByUserIdAndAddressHashAndExpiresAtAfter(eq(USER_ID), anyString(), any(OffsetDateTime.class)))
            .thenReturn(Optional.empty());
        when(cache.findByUserIdAndAddressHash(eq(USER_ID), anyString())).thenReturn(Optional.empty());

        List<StoreOptionResponse> result = service.rankFor(user);

        assertThat(result).isEmpty();
        verify(chatClient, never()).prompt();
        verify(cache).save(any());
    }

    @Test
    void rankFor_normalizesAiRanking_dropsUnknownIds_appendsMissingStoresSortedByName() {
        CurrentUser user = currentUser();
        ClientProfile profile = profileWithAddress("Maputo", "Maputo", "Polana", "Rua 1");
        when(profiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));

        Store storeB = store(2L, "Loja B", true);
        Store storeA = store(1L, "Loja A", false);
        when(stores.findByStatus(StoreStatus.ACTIVE)).thenReturn(List.of(storeB, storeA));

        when(cache.findByUserIdAndAddressHashAndExpiresAtAfter(eq(USER_ID), anyString(), any(OffsetDateTime.class)))
            .thenReturn(Optional.empty());
        when(cache.findByUserIdAndAddressHash(eq(USER_ID), anyString())).thenReturn(Optional.empty());

        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content())
            .thenReturn("[{\"storeId\":2,\"reason\":\"Mais perto.\"},{\"storeId\":999,\"reason\":\"ignorado\"}]");

        List<StoreOptionResponse> result = service.rankFor(user);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(2L);
        assertThat(result.get(0).reason()).isEqualTo("Mais perto.");
        assertThat(result.get(0).rank()).isEqualTo(1);
        assertThat(result.get(1).id()).isEqualTo(1L);
        assertThat(result.get(1).reason()).isEqualTo("Loja activa disponível para a morada indicada.");
        assertThat(result.get(1).rank()).isEqualTo(2);
        verify(cache).save(any());
    }

    @Test
    void rankFor_aiFails_fallsBackToNameSortedRanking() {
        CurrentUser user = currentUser();
        ClientProfile profile = profileWithAddress("Maputo", "Maputo", "Polana", "Rua 1");
        when(profiles.findByUserId(USER_ID)).thenReturn(Optional.of(profile));

        Store storeB = store(2L, "Loja B", true);
        Store storeA = store(1L, "Loja A", false);
        when(stores.findByStatus(StoreStatus.ACTIVE)).thenReturn(List.of(storeB, storeA));

        when(cache.findByUserIdAndAddressHashAndExpiresAtAfter(eq(USER_ID), anyString(), any(OffsetDateTime.class)))
            .thenReturn(Optional.empty());
        when(cache.findByUserIdAndAddressHash(eq(USER_ID), anyString())).thenReturn(Optional.empty());

        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.system(anyString())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenThrow(new RuntimeException("AI indisponível"));

        List<StoreOptionResponse> result = service.rankFor(user);

        assertThat(result).extracting(StoreOptionResponse::id).containsExactly(1L, 2L);
        assertThat(result).allMatch(option -> option.reason().equals("Loja activa disponível para a morada indicada."));
    }

    private CurrentUser currentUser() {
        return new CurrentUser(USER_ID, UUID.randomUUID(), "cliente@example.com", Role.CLIENTE, null);
    }

    private ClientProfile profileWithAddress(String province, String city, String neighborhood, String description) {
        ClientProfile profile = BeanUtils.instantiateClass(ClientProfile.class);
        ReflectionTestUtils.setField(profile, "userId", USER_ID);
        ReflectionTestUtils.setField(profile, "shoppingProvince", province);
        ReflectionTestUtils.setField(profile, "shoppingCity", city);
        ReflectionTestUtils.setField(profile, "shoppingNeighborhood", neighborhood);
        ReflectionTestUtils.setField(profile, "shoppingAddressDescription", description);
        return profile;
    }

    private Store store(Long id, String name, boolean deliveryAvailable) {
        Store store = BeanUtils.instantiateClass(Store.class);
        ReflectionTestUtils.setField(store, "id", id);
        ReflectionTestUtils.setField(store, "name", name);
        ReflectionTestUtils.setField(store, "city", "Maputo");
        ReflectionTestUtils.setField(store, "deliveryAvailable", deliveryAvailable);
        return store;
    }
}
