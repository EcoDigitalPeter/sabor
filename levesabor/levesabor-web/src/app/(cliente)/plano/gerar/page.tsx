// FE-C04 · T-07 A gerar plano — polling + mensagens rotativas (F1-CLI-02, docs/plano/02-ui-ux-plan.md §3 T-07)
// Estados: requesting → generating(polling) → ready(redireciona /plano) | failed(retry) | limit_reached
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError, queryClient } from "@/lib/api";
import type { components } from "@/types/api";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { ErrorState } from "@/components/ui/ErrorState";
import { MESSAGE_ROTATE_INTERVAL_MS, ROTATING_MESSAGES } from "./messages";
import styles from "./page.module.css";

type GenerationHandle = components["schemas"]["GenerationHandle"];
type GenerationStatus = NonNullable<GenerationHandle["status"]>;
type GenerationPollResult = {
  id?: number;
  status?: GenerationStatus;
  mealPlanId?: number | null;
};

type Phase = "requesting" | "generating" | "failed" | "limit_reached";

const POLL_INTERVAL_MS = 2500;
const DEFAULT_ERROR_MESSAGE = "Não foi possível gerar o teu plano agora. Tenta novamente.";

export default function GerarPlanoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("requesting");
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>(DEFAULT_ERROR_MESSAGE);
  const [messageIndex, setMessageIndex] = useState(0);

  const requestGeneration = useMutation<GenerationHandle, Error>({
    mutationFn: () => api<GenerationHandle>("/me/meal-plans", { method: "POST" }),
    onMutate: () => {
      setPhase("requesting");
    },
    onSuccess: (data) => {
      setGenerationId(data.id ?? null);
      setMessageIndex(0);
      setPhase("generating");
    },
    onError: (error) => {
      const code = error instanceof ApiError ? error.code : undefined;
      if (code === "LSA010_PROFILE_INCOMPLETE") {
        // Não devia acontecer normalmente (onboarding garante perfil completo antes de chegar
        // aqui), mas o ecrã tem de ser defensivo: manda o cliente completar o perfil.
        router.replace("/onboarding");
        return;
      }
      if (code === "LSA011_GENERATION_IN_PROGRESS") {
        // O contrato (409 GenerationConflict) não devolve o id da geração já em curso, portanto
        // não há aqui nenhum id para fazer polling — não há forma de saber quando essa outra
        // geração termina. Em vez de simular "generating" indefinidamente (spinner sem saída),
        // tratamos como falha recuperável: o cliente vê o motivo e pode tentar de novo.
        setErrorMessage("Já existe uma geração em curso. Aguarda alguns segundos e tenta novamente.");
        setPhase("failed");
        return;
      }
      if (code === "LSA012_GENERATION_LIMIT") {
        setPhase("limit_reached");
        return;
      }
      setErrorMessage(error instanceof ApiError ? error.message : DEFAULT_ERROR_MESSAGE);
      setPhase("failed");
    },
  });

  // Dispara o pedido de geração ao montar a página. Guarda por ref (não só o array de
  // dependências vazio) porque o React 18 StrictMode invoca efeitos de montagem duas vezes em
  // dev — sem isto, o 2º POST cairia sempre no LSA011_GENERATION_IN_PROGRESS do mock/backend.
  const hasRequestedRef = useRef(false);
  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    requestGeneration.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- disparar apenas uma vez ao montar
  }, []);

  const pollingEnabled = phase === "generating" && generationId !== null;

  const generationQuery = useQuery<GenerationPollResult, Error>({
    queryKey: ["meal-plan-generation", generationId],
    queryFn: () => api<GenerationPollResult>(`/me/meal-plans/${generationId}`),
    enabled: pollingEnabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "READY" || status === "FAILED") return false;
      return POLL_INTERVAL_MS;
    },
  });

  // Estado terminal do polling: READY → invalida o plano ativo e navega; FAILED → estado de erro.
  useEffect(() => {
    const status = generationQuery.data?.status;
    if (status === "READY") {
      queryClient.invalidateQueries({ queryKey: ["active-meal-plan"] });
      router.replace("/plano");
    } else if (status === "FAILED") {
      setErrorMessage("A geração do teu plano falhou. Tenta novamente.");
      setPhase("failed");
    }
  }, [generationQuery.data?.status, router]);

  // Erro de rede/inesperado durante o polling — tratado como falha da geração.
  useEffect(() => {
    if (!generationQuery.isError) return;
    setErrorMessage(
      generationQuery.error instanceof ApiError ? generationQuery.error.message : DEFAULT_ERROR_MESSAGE,
    );
    setPhase("failed");
  }, [generationQuery.isError, generationQuery.error]);

  // Mensagens rotativas — cicla enquanto o ecrã está em "generating".
  useEffect(() => {
    if (phase !== "generating") return;
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % ROTATING_MESSAGES.length);
    }, MESSAGE_ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [phase]);

  function handleRetry() {
    setErrorMessage(DEFAULT_ERROR_MESSAGE);
    setGenerationId(null);
    requestGeneration.mutate();
  }

  return (
    <main className={styles.main}>
      {phase === "requesting" || phase === "generating" ? (
        <div className={styles.generating}>
          <div className={styles.ringWrap}>
            <BrandIllustration variant="generating" size={200} />
          </div>
          <p className={styles.message} role="status" aria-live="polite">
            {ROTATING_MESSAGES[messageIndex]}
          </p>
        </div>
      ) : null}

      {phase === "limit_reached" ? (
        <ErrorState message="Atingiste o limite de hoje — tenta amanhã." />
      ) : null}

      {phase === "failed" ? <ErrorState message={errorMessage} onRetry={handleRetry} /> : null}

      <p className={styles.disclaimer}>
        As sugestões não substituem aconselhamento médico ou nutricional.
      </p>
    </main>
  );
}
