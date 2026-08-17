package com.ottimizo.plans;

import java.math.BigDecimal;

/**
 * {@code PATCH /me/shopping-list/items/{id}} — patch parcial (F1-CLI-06/
 * FE-R01): qualquer campo {@code null} fica por tocar. Ambos os campos sao
 * opcionais de proposito (marcar {@code checked} sem mexer em
 * {@code haveQuantity}, ou vice-versa).
 */
public record SetCheckedRequest(
    Boolean checked,
    BigDecimal haveQuantity
) {
}
