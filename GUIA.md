# Guia de montagem (passo a passo)

Tempo estimado: 2 a 3 horas, sem nenhum custo, divididas entre 02 e 03/11. Siga na ordem e marque cada passo.

O fluxo final:

```
Webhook (recebe a avaliação)
  → Classificar (local, Ollama) → Ler classificação
  → Resposta com Gemini → Ler resposta
  → Juntar tudo
  → Salvar na tabela
  → É urgente? → sim: Alerta no Telegram
  → Responder ao webhook
```

---

## Parte 1: instalar e abrir o n8n (15 min)

- [ ] No PowerShell, rode `npx n8n` e espere aparecer "Editor is now accessible via: http://localhost:5678".
- [ ] Abra http://localhost:5678 no navegador e crie a conta local (fica só no seu PC).
- [ ] Deixe o PowerShell aberto enquanto usar o n8n. Para abrir de novo outro dia, rode `npx n8n` outra vez.

## Parte 2: chave do Gemini e modelo local (20 min)

As chaves são senhas. Cole só dentro do n8n, nunca no código, no GitHub ou em conversas.

- [ ] **Gemini (grátis):** entre em https://aistudio.google.com, clique em **Get API key** e crie uma chave.
- [ ] **Ollama (grátis, local):** confira se está instalado rodando `ollama --version` no PowerShell. Se não estiver, instale em https://ollama.com.
- [ ] Baixe um modelo pequeno: `ollama pull llama3.2` (cerca de 2 GB). Teste com `ollama run llama3.2 "diga oi"`. Seu PC tem pouca RAM, então feche apps pesados enquanto usa.

## Parte 3: cadastrar as credenciais no n8n (10 min)

- [ ] Menu **Credentials → Add credential → Ollama**, com a URL `http://127.0.0.1:11434` (sem chave). No Windows, `localhost` pode falhar.
- [ ] **Add credential → Google Gemini (PaLM) API** e cole a chave do Gemini.

Se o nome da credencial do Gemini for diferente na sua versão do n8n, procure por "Gemini" na busca.

## Parte 4: onde guardar os resultados (15 min)

- [ ] Se o seu n8n tiver **Data tables** (em **Overview → Data tables**), crie uma tabela `avaliacoes` com as colunas: `avaliacao_id`, `data`, `nota` (Number), `canal`, `texto`, `categoria`, `sentimento`, `urgencia`, `motivo`, `resumo`, `resposta_sugerida`. Todas do tipo String, exceto `nota`. A tabela já traz `id`, `createdAt` e `updatedAt` automáticos, por isso o código da avaliação fica em `avaliacao_id`.
- [ ] Se não tiver, use o Google Sheets com as mesmas colunas, seguindo o guia oficial de credenciais do Google no n8n.

## Parte 5: montar o fluxo, nó por nó (1h a 1h30)

Crie um workflow novo chamado **Triagem de avaliações**.

### 1. Webhook

- [ ] **HTTP Method:** POST. **Path:** `avaliacao`.
- [ ] **Respond:** "Immediately" enquanto monta. No passo 10, troque para "Using 'Respond to Webhook' Node".
- [ ] Ligue a saída do Webhook ao próximo nó (precisa aparecer a linha entre eles).

### 2. Classificar (local) (nó Basic LLM Chain + Ollama Chat Model)

- [ ] Adicione o nó **Basic LLM Chain** e renomeie para "Classificar (local)".
- [ ] No campo **Prompt**, escolha "Define below" e cole a parte "Mensagem do usuário" de [`prompts/1-classificacao.md`](prompts/1-classificacao.md).
- [ ] Em **Add Option → System Message**, cole a "Mensagem de sistema".
- [ ] Ligue ao conector **Model** um **Ollama Chat Model**, com a credencial Ollama e o modelo `llama3.2`.
- [ ] Plano B, se o PC ficar lento: troque o Ollama Chat Model por um **Google Gemini Chat Model**.

### 3. Ler classificação (nó Code)

Cole este código. Ele encontra o JSON na resposta, seja qual for o formato que o nó devolveu:

```js
function acharJson(valor) {
  if (valor && typeof valor === 'object') {
    if (valor.categoria || valor.resumo) return valor;
    for (const v of Object.values(valor)) {
      const achado = acharJson(v);
      if (achado) return achado;
    }
  }
  if (typeof valor === 'string' && valor.includes('{')) {
    try { return JSON.parse(valor.slice(valor.indexOf('{'), valor.lastIndexOf('}') + 1)); } catch {}
  }
  return null;
}
const dados = acharJson($json);
if (!dados) throw new Error('Não achei o JSON na resposta do modelo');
return { json: dados };
```

### 4. Resposta com Gemini (nó Basic LLM Chain + Google Gemini Chat Model)

- [ ] Outro **Basic LLM Chain**, renomeado para "Resposta com Gemini", com o texto de [`prompts/2-resposta-gemini.md`](prompts/2-resposta-gemini.md) no campo Prompt.
- [ ] Ligue ao conector **Model** um **Google Gemini Chat Model**, com a credencial do Gemini e o modelo `gemini-3.5-flash-lite`. Evite os modelos "latest", que ficam sobrecarregados (erro 503).
- [ ] Em **Settings**, ative **Retry On Fail** (3 tentativas, 5000 ms).

### 5. Ler resposta (nó Code)

- [ ] Duplique o nó "Ler classificação" (o mesmo código serve).

### 6. Juntar tudo (nó Code)

```js
const av = $('Webhook').item.json.body;
const cls = $('Ler classificação').item.json;
const resp = $json;
return { json: {
  avaliacao_id: av.id, data: av.data, nota: av.nota, canal: av.canal, texto: av.texto,
  categoria: cls.categoria, sentimento: cls.sentimento, urgencia: cls.urgencia, motivo: cls.motivo,
  resumo: resp.resumo, resposta_sugerida: resp.resposta_sugerida,
} };
```

### 7. Salvar na tabela

- [ ] Nó **Data table → Insert** (ou **Google Sheets → Append row**), mapeando cada campo para a coluna de mesmo nome.

### 8. É urgente? (nó If)

- [ ] Condição: `{{ $('Juntar tudo').item.json.urgencia }}` **is equal to** `alta`.

### 9. Alerta no Telegram (saída "true" do If)

- [ ] No Telegram, fale com o **@BotFather**, crie um bot e copie o token. Cadastre como credencial **Telegram** no n8n.
- [ ] Mande uma mensagem para o seu bot e descubra o **seu** chat id com o **@userinfobot**. Não use o número do começo do token: esse é o id do bot, e dá o erro "the bot can't send messages to the bot".
- [ ] Nó **Telegram → Send message**, com o texto:
  `🚨 Avaliação urgente ({{ $('Juntar tudo').item.json.categoria }}): {{ $('Juntar tudo').item.json.resumo }}`

### 10. Responder ao webhook

- [ ] Ligue as duas saídas do If a um nó **Respond to Webhook**, com **Respond With: JSON** e corpo `{{ $('Juntar tudo').item.json }}`.

## Parte 6: testar (20 min)

- [ ] Clique em **Execute workflow** (o webhook fica escutando).
- [ ] Em outro PowerShell, na pasta deste repositório, rode só 1 avaliação:
  `node scripts/enviar-avaliacoes.mjs http://localhost:5678/webhook-test/avaliacao 1`
- [ ] Confira no n8n se cada nó ficou verde e se a linha apareceu na tabela.
- [ ] O modelo local pode demorar alguns segundos por avaliação na primeira vez, enquanto carrega.
- [ ] Teste a avaliação A001 (alergia): ela precisa sair com urgência "alta" e gerar o alerta no Telegram.
- [ ] Publique o workflow (botão **Publish**). A partir daí, a URL é `/webhook/avaliacao`, sem o "-test".

## Parte 7: medir (04/11, cerca de 1h)

1. [ ] **Na mão:** abra `dados/avaliacoes-ficticias.csv`, ligue o cronômetro e faça a triagem das 20 primeiras como um dono de restaurante faria: categoria, urgência e uma resposta curta para o cliente. Anote o tempo total.
2. [ ] **Com o fluxo:** rode as 100: `node scripts/enviar-avaliacoes.mjs http://localhost:5678/webhook/avaliacao`. O script mostra o tempo total e quantas categorias bateram com o gabarito.
3. [ ] Preencha a tabela de [`MEDICAO.md`](MEDICAO.md).

## Parte 8: publicar (05/11)

- [ ] No n8n: menu do workflow (⋯) → **Download**. Salve como `workflow/triagem-avaliacoes.json`. A exportação não leva as chaves, mas abra o arquivo e confira que não há nenhuma.
- [ ] Grave 1 minuto de tela com **Win + Alt + R**: envio de uma avaliação urgente, o fluxo rodando, a linha na tabela e o alerta no Telegram.
- [ ] Me mande o vídeo, o JSON do fluxo e os números da medição. Eu termino o README e atualizo o currículo.
