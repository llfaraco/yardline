# Atualização automática da Visão geral — 20/10/2026

## Causa confirmada
A inicialização renderAllViews carregava o snapshot salvo por GET, e a consulta à Sleeper ficava no botão manual. Assim, o monitor podia detectar mudanças que a interface continuava sem buscar.

## Correções
- league-auto-refresh.js atualiza o núcleo Sleeper após a carga inicial e a cada minuto em uso normal. Compartilha o pedido em andamento com o botão manual.
- Pausa chamadas com aba oculta, conexão offline, modal aberto ou campo de edição em foco. Retoma ao voltar à aba/conexão e aumenta o intervalo após falhas, até cinco minutos.
- Pedidos automáticos não mostram toasts repetitivos. O confronto informa atualização, horário do último snapshot, falha ou offline. Dados anteriores são preservados na falha.
- O backend reúne chamadas simultâneas da mesma liga, semana e modo; chamadas automáticas podem reutilizar resultado de até 30 segundos. Botão manual consulta a fonte novamente quando não há consulta em andamento.
- A sincronização remota não é substituída por uma hidratação de cache em andamento: espera a hidratação e depois consulta a fonte.
- Lookup assíncrono da identidade ocorre antes de publicar o novo snapshot/cards/globais. As páginas recebem o conjunto coerente depois da identificação.
- O monitor JSDOM define YL_DISABLE_AUTO_REFRESH para permanecer somente leitura, sem POSTs automáticos provocados pelo teste.

## Validação
- 34 testes focados passaram, incluindo concorrência, cache curto, recuperação após falha, backoff, pausa offline/aba oculta e commit conjunto de cards/snapshot após identidade assíncrona.
- Suíte geral: 139 testes, 131 aprovados e 8 falhas preexistentes EPERM em arquivos temporários do command center.
- Duas chamadas automáticas simultâneas HTTP 200 em aproximadamente 3.531 ms, com uma consulta compartilhada.
- Conferência real posterior: 8 verificações PASS; nenhuma divergência local/Sleeper, incluindo jogadores e titulares do elenco 4 anteriormente sinalizado. Evidência: referencias-2026-10-20T18-29-11-129Z.json.

## Limites
- Polling de um minuto não é transmissão instantânea; pode haver até um ciclo de atraso, mais tempo da fonte/rede.
- Deduplicação e cache são em memória de um processo. Um futuro ambiente com múltiplas instâncias precisará coordenação compartilhada.
- A validação visual final e a projeção ausente de Davante Adams continuam pendentes do bloco Visão geral. Nenhum valor ausente é inventado.
- Sem deploy ou alteração de credenciais. O monitor de fontes públicas continua somente leitura; a atualização local do produto é uma ação separada, autorizada para esta implementação.
