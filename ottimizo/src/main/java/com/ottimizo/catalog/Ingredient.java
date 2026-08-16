package com.ottimizo.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "ingredients")
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(name = "base_unit", nullable = false)
    private String baseUnit;

    @Column(name = "reference_price_mt")
    private BigDecimal referencePriceMt;

    @Column(nullable = false)
    private boolean active = true;

    protected Ingredient() {
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }
}
