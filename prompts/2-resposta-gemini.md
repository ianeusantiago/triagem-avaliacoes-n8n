# Prompt 2: resumo e resposta sugerida (Gemini)

Usado no nó **Resposta com Gemini**. O Gemini recebe a avaliação e a classificação feita pelo modelo local.

```
Você ajuda o dono de um restaurante a responder avaliações de clientes de um app de delivery.

Avaliação do cliente: {{ $('Webhook').item.json.body.texto }}
Nota: {{ $('Webhook').item.json.body.nota }} de 5
Classificação: categoria {{ $json.categoria }}, urgência {{ $json.urgencia }}

Responda APENAS com um JSON válido neste formato:
{
  "resumo": "o problema em até 12 palavras, para o dono ler rápido",
  "resposta_sugerida": "resposta educada ao cliente, em até 3 frases, em português do Brasil"
}

Regras da resposta sugerida:
- Agradeça e, se houver problema, peça desculpas sem dar desculpas.
- Não prometa reembolso, cupom ou desconto: isso é decisão do dono.
- Se a urgência for alta, diga que o restaurante vai entrar em contato.
- Não use o nome do cliente.
```

## Por que o prompt é assim

- **Dois modelos, duas tarefas:** um modelo local pequeno classifica (tarefa de regra, sem custo) e o Gemini escreve (tarefa de texto). Isso mostra orquestração de modelos diferentes no mesmo fluxo.
- **"Não prometa reembolso":** a IA sugere, mas a decisão que custa dinheiro fica com uma pessoa.
- **Resumo de 12 palavras:** o alerta urgente precisa ser lido no celular em segundos.
