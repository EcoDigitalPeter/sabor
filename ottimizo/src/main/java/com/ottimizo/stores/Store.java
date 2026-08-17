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
import java.time.OffsetDateTime;

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

    private BigDecimal rating;

    @Column(name = "opening_hours_text")
    private String openingHoursText;

    @Column(nullable = false)
    private boolean deliveryAvailable;

    @Enumerated(EnumType.STRING)
    @Column(name = "average_price_level")
    private StorePriceLevel averagePriceLevel;

    private BigDecimal latitude;

    private BigDecimal longitude;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Store() {
    }

    public Store(
        String name,
        String province,
        String city,
        String neighborhood,
        String addressLine,
        String contact,
        boolean deliveryAvailable,
        BigDecimal rating,
        String openingHoursText,
        StorePriceLevel averagePriceLevel,
        BigDecimal latitude,
        BigDecimal longitude
    ) {
        this.name = name;
        this.province = province;
        this.city = city;
        this.neighborhood = neighborhood;
        this.addressLine = addressLine;
        this.contact = contact;
        this.deliveryAvailable = deliveryAvailable;
        this.rating = rating;
        this.openingHoursText = openingHoursText;
        this.averagePriceLevel = averagePriceLevel;
        this.latitude = latitude;
        this.longitude = longitude;
        this.status = StoreStatus.ACTIVE;
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void applyUpdate(
        String name,
        String province,
        String city,
        String neighborhood,
        String addressLine,
        String contact,
        boolean deliveryAvailable,
        BigDecimal rating,
        String openingHoursText,
        StorePriceLevel averagePriceLevel,
        BigDecimal latitude,
        BigDecimal longitude
    ) {
        this.name = name;
        this.province = province;
        this.city = city;
        this.neighborhood = neighborhood;
        this.addressLine = addressLine;
        this.contact = contact;
        this.deliveryAvailable = deliveryAvailable;
        this.rating = rating;
        this.openingHoursText = openingHoursText;
        this.averagePriceLevel = averagePriceLevel;
        this.latitude = latitude;
        this.longitude = longitude;
        this.updatedAt = OffsetDateTime.now();
    }

    public void changeStatus(StoreStatus status) {
        this.status = status;
        this.updatedAt = OffsetDateTime.now();
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String province() {
        return province;
    }

    public String city() {
        return city;
    }

    public String neighborhood() {
        return neighborhood;
    }

    public String addressLine() {
        return addressLine;
    }

    public String contact() {
        return contact;
    }

    public StoreStatus status() {
        return status;
    }

    public BigDecimal rating() {
        return rating;
    }

    public String openingHoursText() {
        return openingHoursText;
    }

    public boolean deliveryAvailable() {
        return deliveryAvailable;
    }

    public StorePriceLevel averagePriceLevel() {
        return averagePriceLevel;
    }

    public BigDecimal latitude() {
        return latitude;
    }

    public BigDecimal longitude() {
        return longitude;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
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
