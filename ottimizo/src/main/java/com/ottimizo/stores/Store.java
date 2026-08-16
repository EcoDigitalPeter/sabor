package com.ottimizo.stores;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "stores")
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String province;

    @Column(nullable = false)
    private String city;

    private String neighborhood;

    @Column(name = "address_line")
    private String addressLine;

    private String contact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StoreStatus status = StoreStatus.ACTIVE;

    @Column(nullable = false)
    private boolean deliveryAvailable;

    private BigDecimal latitude;

    private BigDecimal longitude;

    protected Store() {
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public StoreStatus status() {
        return status;
    }

    public boolean deliveryAvailable() {
        return deliveryAvailable;
    }

    public String addressText() {
        return String.join(", ",
            nonNull(province),
            nonNull(city),
            nonNull(neighborhood),
            nonNull(addressLine)
        ).replaceAll("(, )+", ", ").replaceAll("^, |, $", "");
    }

    private String nonNull(String value) {
        return value == null ? "" : value;
    }
}
