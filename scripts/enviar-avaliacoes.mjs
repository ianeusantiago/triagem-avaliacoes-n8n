// Envia as avaliações do CSV para o webhook do n8n, uma por vez, mede o tempo
// e compara a categoria devolvida com o gabarito.
//
// Uso (Node 18 ou mais novo, sem instalar nada):
//   node scripts/enviar-avaliacoes.mjs http://localhost:5678/webhook/avaliacao
//   node scripts/enviar-avaliacoes.mjs http://localhost:5678/webhook/avaliacao 10   (só as 10 primeiras)

import { readFileSync, writeFileSync } from 'node:fs';

const url = process.argv[2];
const limite = Number(process.argv[3] ?? Infinity);
if (!url) {
  console.error('Informe a URL do webhook. Ex.: node scripts/enviar-avaliacoes.mjs http://localhost:5678/webhook/avaliacao');
  process.exit(1);
}

// Lê um CSV simples com campos entre aspas quando têm vírgula.
function lerCsv(caminho) {
  const linhas = readFileSync(caminho, 'utf8').trim().split(/\r?\n/);
  const cab = linhas[0].split(',');
  return linhas.slice(1).map((linha) => {
    const campos = [];
    let atual = '', aspas = false;
    for (const c of linha) {
      if (c === '"') aspas = !aspas;
      else if (c === ',' && !aspas) { campos.push(atual); atual = ''; }
      else atual += c;
    }
    campos.push(atual);
    return Object.fromEntries(cab.map((k, i) => [k, campos[i]]));
  });
}

const avaliacoes = lerCsv('dados/avaliacoes-ficticias.csv').slice(0, limite);
const gabarito = Object.fromEntries(lerCsv('dados/gabarito.csv').map((g) => [g.id, g.categoria_esperada]));

const resultados = [];
const inicio = Date.now();
for (const av of avaliacoes) {
  const t0 = Date.now();
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...av, nota: Number(av.nota) }),
    });
    const corpo = await resp.json();
    resultados.push({ id: av.id, ok: resp.ok, segundos: (Date.now() - t0) / 1000, esperado: gabarito[av.id], ...corpo });
    console.log(`${av.id}  ${corpo.categoria ?? '?'}  (esperado: ${gabarito[av.id]})  urgência: ${corpo.urgencia ?? '?'}`);
  } catch (erro) {
    resultados.push({ id: av.id, ok: false, erro: String(erro) });
    console.log(`${av.id}  ERRO: ${erro}`);
  }
}
const total = (Date.now() - inicio) / 1000;
const validos = resultados.filter((r) => r.ok && r.categoria);
const acertos = validos.filter((r) => r.categoria === r.esperado).length;

writeFileSync('dados/resultados.json', JSON.stringify(resultados, null, 2));
console.log('\n--- Resumo ---');
console.log(`Avaliações enviadas: ${avaliacoes.length}`);
console.log(`Respondidas sem erro: ${validos.length}`);
console.log(`Tempo total: ${total.toFixed(1)} s (${(total / avaliacoes.length).toFixed(1)} s por avaliação)`);
console.log(`Categoria igual ao gabarito: ${acertos} de ${validos.length} (${((100 * acertos) / Math.max(validos.length, 1)).toFixed(0)}%)`);
console.log('Detalhes salvos em dados/resultados.json');
