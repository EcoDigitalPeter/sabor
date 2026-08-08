// FE-L03 · T-25 Import Excel da loja — drag-&-drop → pré-visualização → confirmação → resultado
// (F3-LOJ-02). O mock não faz parsing real de .xlsx (ver useLojaProducts.ts/fixtures.ts): o
// ficheiro só é validado aqui client-side (extensão/tamanho) — a pré-visualização devolvida é
// sempre a mesma, documentado como limitação aceite do mock.
// Estados idle→validating→preview→confirming→done/failed: "validating" cobre upload+validação
// num único pedido síncrono do mock, em vez de duas fases separadas (sem backend real por trás).
"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileWarning } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  useValidateProductsImport,
  useConfirmProductsImport,
  downloadLojaImportTemplate,
  downloadLojaProductsExport,
  type ImportJob,
} from "@/hooks/useLojaProducts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import styles from "./page.module.css";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type FlowState = "idle" | "validating" | "preview" | "confirming" | "done" | "failed";

function isXlsxFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".xlsx");
}

export default function ImportarPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validateImport = useValidateProductsImport();
  const confirmImport = useConfirmProductsImport();

  const [flow, setFlow] = useState<FlowState>("idle");
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [onlyValidRows, setOnlyValidRows] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  function handleFile(file: File) {
    setFileError(null);
    if (!isXlsxFile(file)) {
      setFileError("Só são aceites ficheiros .xlsx.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setFileError("O ficheiro não pode exceder 5 MB.");
      return;
    }

    setFileName(file.name);
    setFlow("validating");
    validateImport.mutate(file, {
      onSuccess: (result) => {
        setJob(result);
        setFlow("preview");
      },
      onError: (error) => {
        setFileError(error instanceof ApiError ? error.message : "Não foi possível validar o ficheiro.");
        setFlow("idle");
      },
    });
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    if (!job?.id) return;
    setFlow("confirming");
    confirmImport.mutate(
      { jobId: job.id, onlyValidRows },
      {
        onSuccess: (result) => {
          setJob(result);
          setFlow("done");
        },
        onError: (error) => {
          showToast(error instanceof ApiError ? error.message : "Não foi possível aplicar o import.", "error");
          setFlow("failed");
        },
      },
    );
  }

  function handleReset() {
    setFlow("idle");
    setJob(null);
    setFileName(null);
    setFileError(null);
  }

  async function handleDownloadTemplate() {
    try {
      await downloadLojaImportTemplate();
    } catch {
      showToast("Não foi possível descarregar o template.", "error");
    }
  }

  async function handleDownloadExport() {
    try {
      await downloadLojaProductsExport();
    } catch {
      showToast("Não foi possível exportar o catálogo.", "error");
    }
  }

  return (
    <div className={styles.page}>
      <Link href="/loja/produtos" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar aos produtos
      </Link>

      <h1 className={styles.title}>Importar Excel</h1>

      <div className={styles.templateLinks}>
        <button type="button" className={styles.linkButton} onClick={handleDownloadTemplate}>
          Descarregar template
        </button>
        <button type="button" className={styles.linkButton} onClick={handleDownloadExport}>
          Exportar catálogo atual
        </button>
      </div>

      {(flow === "idle" || flow === "validating") && (
        <Card>
          <div
            className={[styles.dropzone, dragActive ? styles.dropzoneActive : ""].filter(Boolean).join(" ")}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} aria-hidden="true" />
            <p className={styles.dropzoneText}>
              {flow === "validating" ? `A validar "${fileName}"…` : "Arrasta um ficheiro .xlsx aqui ou clica para escolher"}
            </p>
            <p className={styles.dropzoneHint}>Máx. 5 MB · apenas .xlsx</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className={styles.hiddenInput}
              onChange={handleInputChange}
              disabled={flow === "validating"}
            />
          </div>
          {fileError ? (
            <div className={styles.banner}>
              <ErrorState message={fileError} />
            </div>
          ) : null}
        </Card>
      )}

      {(flow === "preview" || flow === "confirming") && job ? (
        <Card>
          <h2 className={styles.sectionTitle}>Pré-visualização — {fileName}</h2>
          <div className={styles.summaryRow}>
            <span>{job.totalRows ?? 0} linhas</span>
            <span className={styles.summaryOk}>{job.validRows ?? 0} válidas</span>
            <span className={styles.summaryError}>{job.errorRows ?? 0} com erro</span>
          </div>

          {job.errors && job.errors.length > 0 ? (
            <table className={styles.errorTable}>
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Erro</th>
                </tr>
              </thead>
              <tbody>
                {job.errors.map((rowError) => (
                  <tr key={rowError.row} className={styles.errorRow}>
                    <td>
                      <FileWarning size={14} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 6 }} />
                      {rowError.row}
                    </td>
                    <td>{rowError.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <Checkbox
            label="Importar apenas as linhas válidas"
            checked={onlyValidRows}
            disabled={flow === "confirming"}
            onChange={(event) => setOnlyValidRows(event.target.checked)}
          />

          <div className={styles.actions}>
            <Button type="button" variant="primary" loading={flow === "confirming"} disabled={flow === "confirming"} onClick={handleConfirm}>
              Confirmar importação
            </Button>
            <Button type="button" variant="secondary" disabled={flow === "confirming"} onClick={handleReset}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : null}

      {flow === "done" && job ? (
        <Card>
          <h2 className={styles.sectionTitle}>Import concluído</h2>
          <p className={styles.resultText}>
            {job.createdCount ?? 0} produto(s) criado(s), {job.updatedCount ?? 0} atualizado(s)
            {job.errorRows ? `, ${job.errorRows} linha(s) ignorada(s) por erro` : ""}.
          </p>
          <div className={styles.actions}>
            <Button type="button" variant="primary" onClick={() => router.push("/loja/produtos")}>
              Ver produtos
            </Button>
            <Button type="button" variant="secondary" onClick={handleReset}>
              Importar outro ficheiro
            </Button>
          </div>
        </Card>
      ) : null}

      {flow === "failed" ? (
        <Card>
          <ErrorState message="Não foi possível aplicar o import." onRetry={handleReset} />
        </Card>
      ) : null}
    </div>
  );
}
