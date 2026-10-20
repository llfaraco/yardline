# Revisão conjunta das três abas — 20/10/2026

## Visão geral
- Retirada a faixa NFL alimentada por TICKER_GAMES fixo. O código exibia BUF 24 x ATL 21 como ao vivo e fazia um relógio local avançar sem fonte NFL.
- Sem provedor de placares NFL integrado, a faixa fica oculta. O placar fantasy oficial do confronto continua presente.
- Mantidos o resumo compartilhado, a orientação do confronto, a cobertura das projeções e os estados de atualização.

## Meu Playbook
- Título e descrição agora correspondem à funcionalidade implementada. Removida a promessa de consenso de especialistas sem fonte.
- Corrigido o cálculo do rótulo de slot: usa STARTER_n do matchup, preservando FLEX e outras posições mesmo quando há espaços vazios na escalação.

## Confronto da semana
- Removidos título/descrição fixos de 12 times, seis confrontos e Semana 6.
- Linhas dos atletas agora distinguem pontos realizados e projeção Sleeper, com rótulos, slot oficial, time NFL e botão acessível de abertura do perfil.
- Projeções são apresentadas somente quando recebidas de fonte Sleeper reconhecida no formato de pontuação LEAGUE. Métricas ausentes não geram zero ou células numéricas fictícias.
- Cabeçalhos de cada elenco e espaçamento/grade dos jogadores ajustados para leitura em desktop e celular pela estrutura CSS.

## Verificação
- 17 testes focados aprovados: contexto compartilhado, projeção incompleta, zero real, posições com slot vazio, distinção entre pontos e estimativas, navegação real e ausência do relógio simulado.
- Suíte completa: 145 testes, 137 aprovados e 8 falhas preexistentes EPERM em arquivos temporários do command center.
- Verificações de sintaxe e git diff --check passaram.
- Revisão de estrutura e comportamento em JSDOM. Aprovação visual de viewport real permanece pendente da captura atual solicitada; não foi observada uma tela nova pelo navegador nesta rodada.

## Limites
Não foi adicionado um feed NFL ao vivo nem consenso de especialistas. A ausência dessas integrações não é escondida por exemplos. Nenhuma publicação em produção.
