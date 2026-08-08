// FE-L02 · T-24 Formulário de produto da loja (edição) — F3-LOJ-01: desativar/reativar,
// eliminar bloqueado quando o produto está numa encomenda ativa (mensagem 409 do mock — ao
// contrário de admin/lojas, aqui não há uma contagem pré-carregada para desativar o botão à
// partida, por isso a tentativa de eliminar é sempre permitida e o bloqueio aparece no erro).
"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  useLojaProduct,
  useUpdateLojaProduct,
  useSetLojaProductStatus,
  useDeleteLojaProduct,
  type ProductRequest,
} from "@/hooks/useLojaProducts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ProductFormFields, type ProductFormErrors, type ProductFormValues, type ProductCategory } from "../ProductFormFields";
import styles from "./page.module.css";

const DUPLICATE_MESSAGE_FALLBACK = "Já existe um produto com este nome nesta loja.";
const GENERIC_ERROR_MESSAGE = "Não foi possível guardar as alterações. Tenta novamente.";
const DELETE_BLOCKED_FALLBACK = "Este produto está numa encomenda ativa — desativa-o em vez de eliminar.";

function validate(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > 120) {
    errors.name = "O nome deve ter entre 2 e 120 caracteres.";
  }
  if (values.unitLabel.trim().length < 1) {
    errors.unitLabel = "A unidade/tamanho é obrigatória.";
  }
  const price = Number(values.priceMt);
  if (!values.priceMt.trim() || Number.isNaN(price) || price <= 0) {
    errors.priceMt = "Indica um preço válido, maior que zero.";
  }
  return errors;
}

export default function ProdutoDetalhePage({ params }: { params: { id: string } }) {
  const productId = Number(params.id);
  const router = useRouter();
  const idPrefix = useId();
  const { showToast } = useToast();

  const { data: product, isLoading, isError, refetch } = useLojaProduct(productId);
  const updateProduct = useUpdateLojaProduct(productId);
  const setProductStatus = useSetLojaProductStatus();
  const deleteProduct = useDeleteLojaProduct();

  const [values, setValues] = useState<ProductFormValues>({ name: "", category: "CEREAIS", unitLabel: "", priceMt: "" });
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!product) return;
    setValues({
      name: product.name ?? "",
      category: (product.category as ProductCategory) ?? "CEREAIS",
      unitLabel: product.unitLabel ?? "",
      priceMt: product.priceMt !== undefined ? String(product.priceMt) : "",
    });
  }, [product]);

  function handleChange(patch: Partial<ProductFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBannerMessage(null);

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const body: ProductRequest = {
      name: values.name.trim(),
      category: values.category,
      unitLabel: values.unitLabel.trim(),
      priceMt: Number(values.priceMt),
    };

    updateProduct.mutate(body, {
      onSuccess: () => {
        showToast("Produto atualizado.");
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === "LSA006_DUPLICATE") {
          const message = error.message ?? DUPLICATE_MESSAGE_FALLBACK;
          setErrors((current) => ({ ...current, name: message }));
        } else {
          setBannerMessage(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
        }
      },
    });
  }

  function handleToggleStatus() {
    if (!product) return;
    const nextStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setProductStatus.mutate(
      { id: productId, status: nextStatus },
      {
        onSuccess: () => {
          showToast(nextStatus === "ACTIVE" ? "Produto reativado." : "Produto desativado.");
          setStatusDialogOpen(false);
        },
        onError: (error) => {
          showToast(error instanceof ApiError ? error.message : "Não foi possível mudar o estado do produto.", "error");
          setStatusDialogOpen(false);
        },
      },
    );
  }

  function handleDelete() {
    deleteProduct.mutate(productId, {
      onSuccess: () => {
        showToast("Produto eliminado.");
        router.push("/loja/produtos");
      },
      onError: (error) => {
        showToast(error instanceof ApiError ? error.message : DELETE_BLOCKED_FALLBACK, "error");
        setDeleteDialogOpen(false);
      },
    });
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonBlock}>
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="rect" height={220} />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className={styles.page}>
        <Link href="/loja/produtos" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar aos produtos
        </Link>
        <ErrorState message="Não foi possível carregar este produto." onRetry={() => refetch()} />
      </div>
    );
  }

  const isInactive = product.status === "INACTIVE";

  return (
    <div className={styles.page}>
      <Link href="/loja/produtos" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar aos produtos
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{product.name}</h1>
        <StatusBadge status={product.status ?? "ACTIVE"} />
      </header>

      {bannerMessage ? (
        <div className={styles.banner}>
          <ErrorState message={bannerMessage} />
        </div>
      ) : null}

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <ProductFormFields
            idPrefix={idPrefix}
            values={values}
            errors={errors}
            disabled={updateProduct.isPending}
            onChange={handleChange}
          />

          <div className={styles.actions}>
            <Button type="submit" variant="primary" loading={updateProduct.isPending} disabled={updateProduct.isPending}>
              Guardar alterações
            </Button>
          </div>
        </form>
      </Card>

      <Card className={styles.dangerCard}>
        <h2 className={styles.dangerTitle}>Estado e eliminação</h2>

        <div className={styles.dangerRow}>
          <Button type="button" variant="secondary" onClick={() => setStatusDialogOpen(true)}>
            {isInactive ? "Reativar produto" : "Desativar produto"}
          </Button>

          <Button type="button" variant="secondary" onClick={() => setDeleteDialogOpen(true)}>
            Eliminar produto
          </Button>
        </div>

        <p className={styles.dangerHint}>
          Se o produto estiver numa encomenda ativa, a eliminação é bloqueada — desativa-o em vez disso.
        </p>
      </Card>

      <ConfirmDialog
        open={statusDialogOpen}
        title={isInactive ? "Reativar produto" : "Desativar produto"}
        message={
          isInactive
            ? `Tens a certeza que queres reativar "${product.name}"? Volta a ficar visível no catálogo.`
            : `Tens a certeza que queres desativar "${product.name}"? Deixa de ficar visível para novas encomendas.`
        }
        confirmLabel={isInactive ? "Reativar" : "Desativar"}
        destructive={!isInactive}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusDialogOpen(false)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar produto"
        message={`Tens a certeza que queres eliminar "${product.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
