package com.ottimizo.loja;

/**
 * Erro de validacao de uma linha do ficheiro Excel importado. {@code row} e o
 * numero de linha 1-based tal como aparece na folha de calculo (linha 1 e o
 * cabecalho, os dados comecam na linha 2), para o lojista conseguir localizar
 * a linha errada sem contar a partir de zero.
 */
public record ImportRowError(int row, String message) {
}
