# Yardline — Fundação visual

Primeira camada: estrutura geral da aplicação. Cards de atletas, dossiê e conteúdo do Playbook ficam para as próximas etapas.

## Direção

Interface clara, editorial e tranquila: fundo cinza frio, superfícies brancas, azul-marinho para identidade e verde-petróleo para ações. A hierarquia se apoia em espaço, tipografia e contraste; sombras leves e ilustração de campo feita em CSS substituem efeitos excessivos. Nenhuma imagem, marca ou código das referências foi incorporado.

Referências públicas consultadas em 20/10/2026:

- [FantasyPros My Playbook](https://www.fantasypros.com/nfl/myplaybook/intro): organização por liga, elenco e ferramentas de decisão.
- [Documentação pública do dashboard](https://support.fantasypros.com/hc/en-us/articles/360018746693-What-is-the-My-Playbook-Dashboard-NFL): visão geral como ponto de entrada para ferramentas específicas.
- [Sleeper Fantasy Football](https://sleeper.com/fantasy-football): contexto de liga, pesquisa e interação.

Essa pesquisa foi documental. Não houve login ou alegação de observação de telas autenticadas. A inspeção visual pelo navegador integrado estava bloqueada pela política de acesso na sessão; testes DOM não equivalem à homologação visual.

## Implementação

- `css/visual-shell.css`: tokens e estilos da camada visual, carregados após os estilos legados para permitir evolução incremental.
- `js/visual-shell.js`: menu móvel, foco, Escape, backdrop, shortcut `/` para busca e tratamento de mudança de breakpoint.
- Cabeçalho: marca textual própria, busca de jogadores, chat e conta. Ações especializadas permanecem na navegação lateral. Indicador de Git e assinatura fixa ALL-PRO deixam de aparecer no cabeçalho.
- Navegação: grupos em português, acesso explícito a jogadores e todos os destinos acessíveis em telas pequenas. A sidebar móvel usa `inert` fechada, controle expandido e retorno de foco.
- Página inicial: abertura editorial sem estatísticas simuladas, atalhos reais para Playbook/confrontos/waivers, seguida do feed existente. Removido wrapper que acrescentava detalhes internos da ingestão acima do conteúdo.
- Chat: recolhido por padrão para novos estados locais; preferência salva de expansão é respeitada. Continua disponível pelo cabeçalho.
- Título e subtítulo passam a acompanhar a seleção da navegação, com `aria-current` no destino ativo.

## Tokens e adaptação

| Papel | Valor |
|---|---|
| Fundo | `#f5f7f9` |
| Superfície | `#ffffff` |
| Identidade / títulos | `#162d43` |
| Ação principal | `#176b62` |
| Texto secundário | `#5d6e80` |
| Borda | `#e3e9ee` |

Sidebar de 230 px em desktop, drawer até 900 px, cabeçalho em duas linhas até 600 px e atalhos empilhados no celular. Chat sobreposto em larguras intermediárias. Estados de foco visíveis e preferência de movimento reduzido preservados. O shell não oculta destinos para economizar espaço.

## Validação

Testes específicos de interação verificam abertura/fechamento, Escape, retorno de foco, destino selecionado, ausência de erros não capturados e atalho de busca que respeita campos de texto e modais. Os testes existentes de acessibilidade, contratos de cards e projeções também foram executados; resultados detalhados ficam nos logs da entrega. HTTP confirmou que a página e os dois novos assets são servidos na prévia local.

Resultados: **28/28** testes focados passaram. Suíte completa: **111 testes, 103 passaram e 8 falharam**, mantendo as oito falhas anteriores de rename/EPERM no armazenamento operacional do Command Center. Sintaxe JavaScript, parser CSS e `git diff --check` passaram. A prévia local retornou HTTP 200 para página, stylesheet, script e revisão de atualização automática. Não houve implantação de produção.

Próximo passo de produto: revisar esta direção com o usuário e avançar para cards e Meu Playbook, preservando dados rastreáveis e as regras da liga.
