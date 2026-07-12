// MOCK-02 · Handlers MSW — todo o frontend desenvolve contra isto até INT-01/INT-03
// Cobrir TODOS os endpoints do OpenAPI (MOCK-01) com fixtures realistas:
//  - 1 plano completo: 7 dias × 3 refeições com pratos moçambicanos (xima, matapa, feijão nhemba, caril de peixe…)
//  - lista de compras agregada por categoria
//  - catálogos admin (utilizadores, lojas, produtos, receitas, ingredientes) paginados
//  - respostas de erro LSAxxx (LSA002 credenciais, LSA012 limite diário, LSA014 sem alternativa, LSA023 publicação)
import { http, HttpResponse } from "msw";

const ok = <T,>(data: T) => HttpResponse.json({ status: "success", data });

export const handlers = [
  http.get("*/api/v1/me/meal-plans/active", () =>
    ok({ id: 1, weekStart: "2026-07-13", status: "READY", days: [] /* TODO MOCK-02: fixture completa */ }),
  ),
  // TODO MOCK-02: restantes handlers (auth, profile, generation+polling, swap, shopping-list, admin/*)
];
