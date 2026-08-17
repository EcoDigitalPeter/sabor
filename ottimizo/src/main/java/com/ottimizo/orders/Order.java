package com.ottimizo.orders;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * Encomenda do cliente a uma loja parceira (BE-C07, F1-CLI-07 / F3-CLI-07),
 * mapeando a tabela {@code orders} (V004). {@code storeName}/{@code
 * storeContact} e {@code customerName}/{@code customerContact} sao snapshots
 * tirados no momento da criacao (mesmo principio de {@code OrderItem} para os
 * itens) — nao seguem a loja/utilizador se estes forem editados depois, para
 * a encomenda continuar a reflectir o que foi acordado na altura.
 *
 * <p>{@code storeId}/{@code userId} ficam como colunas escalares (sem relacao
 * JPA gerida), mesmo padrao de {@link com.ottimizo.loja.Product}.
 */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "store_id", nullable = false, updatable = false)
    private Long storeId;

    @Column(name = "store_name", nullable = false)
    private String storeName;

    @Column(name = "store_contact")
    private String storeContact;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "customer_contact")
    private String customerContact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDENTE;

    private String note;

    @Column(name = "reject_reason")
    private String rejectReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Order() {
    }

    public Order(
        Long userId,
        Long storeId,
        String storeName,
        String storeContact,
        String customerName,
        String customerContact,
        String note
    ) {
        this.userId = userId;
        this.storeId = storeId;
        this.storeName = storeName;
        this.storeContact = storeContact;
        this.customerName = customerName;
        this.customerContact = customerContact;
        this.note = note;
        this.status = OrderStatus.PENDENTE;
    }

    /**
     * Mudanca de estado sem motivo (usada por {@link #cancel()} e pelas
     * transicoes da loja, BE-L04, que nao sejam RECUSADA). Delega em
     * {@link #changeStatus(OrderStatus, String)} com {@code rejectReason}
     * nulo.
     */
    public void changeStatus(OrderStatus status) {
        changeStatus(status, null);
    }

    /**
     * Mudanca de estado do lado da loja, com motivo opcional (BE-L04,
     * {@code OrderStateMachine} valida a transicao antes de chamar isto —
     * este metodo em si nao valida nada, so aplica). {@code rejectReason}
     * so faz sentido quando {@code status == RECUSADA}; o chamador e
     * responsavel por so o passar nesse caso ({@link
     * com.ottimizo.orders.LojaOrderService#updateStatus} garante isso).
     */
    public void changeStatus(OrderStatus status, String rejectReason) {
        this.status = status;
        this.rejectReason = rejectReason;
        this.updatedAt = OffsetDateTime.now();
    }

    /** {@code PATCH /me/orders/{id}/cancel} — accao exclusiva do cliente (F3-CLI-07). */
    public void cancel() {
        changeStatus(OrderStatus.CANCELADA);
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long id() {
        return id;
    }

    public Long userId() {
        return userId;
    }

    public Long storeId() {
        return storeId;
    }

    public String storeName() {
        return storeName;
    }

    public String storeContact() {
        return storeContact;
    }

    public String customerName() {
        return customerName;
    }

    public String customerContact() {
        return customerContact;
    }

    public OrderStatus status() {
        return status;
    }

    public String note() {
        return note;
    }

    public String rejectReason() {
        return rejectReason;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}
