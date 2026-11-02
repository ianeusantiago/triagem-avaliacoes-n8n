# Medição

Feita em 02/11/2026, com as 100 avaliações fictícias de [`dados/`](dados/) e o gabarito de categorias.

## Triagem na mão

| Medida | Valor |
| --- | --- |
| Avaliações feitas na mão | 20 |
| Tempo total | 14 min 34 s |
| Tempo por avaliação | 44 s |
| Tempo estimado para 100 | ~73 min |
| Categoria igual ao gabarito | 18 de 19 conferidas |

## Triagem com o fluxo

Duas versões do prompt de classificação, rodando no mesmo modelo local (llama3.2 no Ollama).

| Medida | Prompt v1 | Prompt v2 |
| --- | --- | --- |
| Avaliações respondidas | 94 de 100 | 99 de 100 |
| Categoria igual ao gabarito | 61 de 94 (65%) | **87 de 99 (88%)** |
| Acertos em "sugestao" | 0 de 10 | 10 de 10 |
| Tempo total para 100 | 10 min | 25 min (com 4 s de pausa entre envios) |

**O que mudou do v1 para o v2:** o v1 só listava os nomes das categorias. O v2 define cada uma, traz regras de desempate ("elogia e sugere" é sugestão; "faltou item" é pedido errado, não atraso) e oito exemplos curtos. Os erros do v1 seguiam padrões claros, e cada regra nova responde a um deles.

**Por que a v2 levou mais tempo:** o plano gratuito do Gemini limita as chamadas por minuto. Sem pausa, 31 avaliações falharam. Com 4 s de pausa e até 3 novas tentativas, falhou só 1. O tempo maior é o limite do plano gratuito, não o fluxo.

## Resultado

**Tempo economizado a cada 100 avaliações:** cerca de 48 min (de ~73 min na mão para 25 min com o fluxo, sem ninguém precisar ficar na frente da tela).

**Acerto de categoria:** 88%, contra 95% da triagem feita por uma pessoa (18 de 19), usando um modelo pequeno, gratuito e local.

## Limitações encontradas

- **Urgência:** o modelo local ainda marca "alta" demais (64 de 99), principalmente em atrasos simples, mesmo com a regra escrita no prompt. A próxima melhoria é calcular a urgência no nó Code com regras fixas (palavras como "alergia", "de novo", "não chegou") em vez de deixar com o modelo.
- **Confusões que sobraram:** pedido errado contra atendimento (A002, A040, A054) e atraso contra atendimento (A070, A086, A099).

O fluxo não elimina o trabalho humano: o dono ainda lê os alertas urgentes e decide sobre reembolsos. O ganho está em não precisar ler e classificar todas as avaliações uma a uma.
