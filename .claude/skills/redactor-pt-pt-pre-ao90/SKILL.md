---
name: redactor-pt-pt-pre-ao90
description: Regras para redigir, reescrever, corrigir, traduzir e rever qualquer texto do projecto Ottimizzo em Português Europeu (PT-PT), grafia pré-Acordo Ortográfico de 1990. Usar sempre que se escrever ou editar copy de interface, documentação, specs, mensagens de commit em prosa, ou qualquer texto humano no repositório. Não se aplica a código, identificadores, endpoints ou strings de configuração.
---

# Redactor PT-PT Pré-AO90

Fonte: `portugues regras.txt` (raiz do repo), destilada nesta skill para consulta rápida durante o trabalho. Contexto do produto: Moçambique — preservar vocabulário e realidade moçambicana legítimos, não os "aportuguesar".

## Regra fundamental

Português Europeu, norma-padrão, grafia pré-AO90, vocabulário português europeu, sem brasileirismos desnecessários, sem apagar expressões moçambicanas legítimas (ex.: "chapa" não vira "autocarro").

Prioridade em caso de conflito: **significado → informação técnica exacta → português europeu → grafia pré-AO90 → contexto moçambicano → clareza → não mexer por mexer.**

## Ortografia pré-AO90 — grafias a manter

acção, actual, actualização, adopção, baptismo, concepção, direcção, eléctrico, exactamente, excepção, óptimo, objectivo, objecto, projecto, recepção, redacção, selecção, transacção, interacção, protecção, inspecção, colecção, correcção, efectuar.

Não inventar consoantes onde não existem etimologicamente (facto/contacto/pacto têm "c"; não acrescentar "c"/"p" a esmo só para "parecer antigo").

## Vocabulário — preferir / evitar

| Preferir | Evitar |
|---|---|
| utilizador | usuário |
| aplicação | aplicativo |
| ficheiro | arquivo |
| ecrã | tela |
| telemóvel | celular |
| palavra-passe | senha |
| correio electrónico | e-mail/correio eletrônico |
| registo | registro/cadastro |
| equipa | equipe |
| gestão | gerenciamento |
| partilha | compartilhamento |
| facturação | faturamento |

Nomes próprios/institucionais (Moçambique, Maputo, Ottimizzo, GitHub, etc.) nunca se traduzem nem se "corrigem".

## Gramática — pontos que mais falham

- **Estar a + infinitivo**, não gerúndio: "está a processar", nunca "está processando".
- **Colocação pronominal europeia**: "permite-lhe", "deve seleccioná-la" — não antepor o pronome ao verbo por hábito brasileiro.
- **Infinitivo pessoal**: "é necessário os utilizadores efectuarem o registo" — não eliminar a flexão.
- **"Ter de"** em texto formal, não "ter que".
- **Concordância com "haver" existencial**: singular sempre — "havia vários erros", nunca "haviam vários erros".
- **Regência tradicional**: participar **em**, informar alguém **de/sobre**, ter acesso **a**, assistir **a** uma reunião.
- Tratamento do utilizador: preferir construções impessoais ("Seleccione a opção", "É necessário introduzir...") a "você" indiscriminado.

## Pontuação e formatação

- Sem vírgula entre sujeito e predicado.
- Aspas «portuguesas» em prosa; aspas rectas/inglesas aceitáveis quando reproduzem UI/código literalmente.
- Sem maiúsculas em excesso (só nomes próprios/títulos oficiais).
- Datas: "8 de Agosto de 2026" em prosa, `2026-08-08` em contexto técnico — não misturar no mesmo documento.
- Moeda: MT (metical), nunca converter para EUR/USD automaticamente.

## Nunca tocar

Código, nomes de variáveis/funções, endpoints, URLs, comandos, nomes de tabelas/campos, identificadores, strings que têm de bater certo com uma API, valores de configuração. A skill corrige só o texto humano à volta do código, nunca o código em si.

## Checklist antes de entregar texto

1. Está em português europeu, sem brasileirismos?
2. Grafias pré-AO90 mantidas (acção não ação, projecto não projeto, etc.)?
3. Concordância e regência correctas?
4. "Estar a + infinitivo" em vez de gerúndio, onde aplicável?
5. Identificadores técnicos intocados?
6. Contexto moçambicano preservado (nomes, MT, expressões legítimas)?
7. Não reescreveu um texto que já estava correcto só por mexer?

## Exemplo rápido

Entrada: "O usuário deve selecionar a opção para atualizar o cadastro."
Saída: "O utilizador deve seleccionar a opção para actualizar o registo."
