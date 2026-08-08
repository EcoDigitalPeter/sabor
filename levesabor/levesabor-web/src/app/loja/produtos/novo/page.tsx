// FE-L02 · T-24 Formulário de produto da loja (criação) — F3-LOJ-01
"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useCreateLojaProduct, type ProductRequest } from "@/hooks/useLojaProducts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { ProductFormFields, type ProductFormErrors, type ProductFormValues } from "../ProductFormFields";
import styles from "./page.module.css";

const DUPLICATE_MESSAGE_FALLBACK = "Já existe um produto com este nome nesta loja.";
const GENERIC_ERROR_MESSAGE = "Não foi possível criar o produto. Tenta novamente.";

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

export default function NovoProdutoPage() {
  const router = useRouter();
  const idPrefix = useId();
  const { showToast } = useToast();
  const createProduct = useCreateLojaProduct();

  const [values, setValues] = useState<ProductFormValues>({
    name: "",
    category: "CEREAIS",
    unitLabel: "",
    priceMt: "",
  });
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

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

    createProduct.mutate(body, {
      onSuccess: () => {
        showToast("Produto criado.");
        router.push("/loja/produtos");
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

  return (
    <div className={styles.page}>
      <Link href="/loja/produtos" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar aos produtos
      </Link>

      <h1 className={styles.title}>Novo produto</h1>

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
            disabled={createProduct.isPending}
            onChange={handleChange}
          />

          <div className={styles.actions}>
            <Button type="submit" variant="primary" loading={createProduct.isPending} disabled={createProduct.isPending}>
              Criar produto
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={createProduct.isPending}
              onClick={() => router.push("/loja/produtos")}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
