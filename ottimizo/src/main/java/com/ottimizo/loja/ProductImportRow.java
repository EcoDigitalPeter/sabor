package com.ottimizo.loja;

import java.math.BigDecimal;

/**
 * Uma linha ja validada do ficheiro Excel importado (BE-L03) — o que
 * {@link LojaImportService#validate} guarda em {@link ImportJob#payload()}
 * e {@link LojaImportService#confirm} le de volta para fazer o upsert em
 * {@link Product}. Linhas invalidas nunca chegam aqui — ficam em
 * {@link ImportRowError} apenas.
 */
public record ProductImportRow(String name, ProductCategory category, String unitLabel, BigDecimal priceMt) {
}
