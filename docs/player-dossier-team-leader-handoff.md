# Dossier profundo — Team Leader → Antigravity

**Estado: revisão obrigatória; não distribuir o backlog antigo cegamente.** Este documento é contrato de implementação, não evidência de paridade ou release aprovada. Nenhuma implementação do dossier completo no frontend principal faz parte desta correção.

## Referência do jogador

- Relatório externo esperado: [FantasyPros — Bijan Robinson](fantasypros-bijan-yardline-audit.md).
- Origem fornecida pelo operador: `/home/ubuntu/fantasypros_bijan_yardline_audit.md`. Se o arquivo não estiver disponível, registrar **NOT_VERIFIABLE**, não reconstruir o relatório nem inventar observações.
- Preservar as classificações **OBSERVED / INFERRED / NOT_VERIFIABLE** do relatório. Observação externa histórica não vira PASS atual de Yardline.
- Não copiar código, imagens, fontes, marca ou outros assets proprietários. Reutilizar princípios comportamentais com identidade visual própria.

## Ordem de trabalho e responsabilidade

1. **Team Leader + Senior QA:** revisar `harnessCorrections`, `reviewHistory` e os checks exatos do ciclo novo. Não reenviar oito falhas de `aria-modal` medido após fechamento nem oito claims de tabs em modal não hidratado.
2. **Frontend + Design + Accessibility (Antigravity):** implementar o layout original mesclado abaixo. Abertura deve vir do card real, com identidade canônica carregada, foco, backdrop e scroll corretos.
3. **Data + Sleeper Integration + Scoring + Backend:** fornecer DTOs, cálculos auditáveis e proveniência. Ausência de dado é null/empty/error/gated declarado, nunca estatística ou sentimento inventado.
4. **News (NFL/Yahoo):** vínculo canônico do jogador, URL canônica, autor/fonte e horário editorial; deduplicação e distinção entre publicação e ingestão.
5. **Senior QA:** testar comportamento real, cada contexto e estados; homologar somente com evidência fresca do check exato no commit/árvore atuais. Mobile, login e fluxos privados continuam **NOT_VERIFIABLE** até teste autorizado em navegador real.

## Layout e oito contextos canônicos

**Mescla desejada:** sidebar de liga / meu roster / jogadores recentes; hero do atleta; tabs; sentiment explicável; expert note; game logs e stats. Não clonar tela proprietária.

| Contexto obrigatório | Aceite para implementação futura |
| --- | --- |
| Latest News | Notícias reais vinculadas ao atleta com fonte, URL canônica e timestamps. |
| Game Logs | Histórico por jogo/semana, season/type, adversário e breakdown de fantasy scoring; dados indisponíveis explícitos. |
| Season Stats | Agregações da temporada identificada, métricas e origem; não misturar temporadas/playoffs. |
| Outlook | Perspectiva editorial/derivada identificada e datada, horizonte temporal e incerteza. |
| News & Analysis | Editorial/análise distinguível de cálculo; uma aba combinada com Latest News pode cobrir ambos os contextos se conteúdo e proveniência forem explícitos. |
| Depth Chart | Ordem e papel reais com fonte/horário; não inferir escalação a partir de ausência. |
| Leagues | Roster/ownership/scoring da liga Sleeper real; sem claims de integração privada não testada. |
| Full Profile | Biografia, identidades cruzadas verificadas, status e ficha completa com proveniência; não equivale automaticamente a sidebar parcial. |

Abas adicionais presentes, como **Consensus Sentiment (Coach AI)**, também devem ser exercitadas pelo QA. O harness registra `observedTabs` e `actualInteractions`; não renomeia cinco botões reais como oito botões existentes.

### Hero, sentiment e expert note

- Hero original: foto licenciada/oficial permitida, nome, posição, franquia, bye, idade, ranks/projeções identificados por formato e horizonte, confronto e contexto ROS quando realmente disponíveis.
- Percentuais de roster da liga não podem se passar por percentuais globais de plataforma.
- Coach AI / Consensus Sentiment: overall, upside, bust, confiança, inputs, versão do cálculo, tempo, narrativa explicável e limitações. Falta de modelo/dado fica indisponível, não consenso fabricado.
- Expert note: autoria/fonte e horário, separada de síntese Yardline. Não fingir opinião de especialista real.
- Tabelas: unidades, season/week/regular vs playoffs, null diferente de zero, headers acessíveis, paginação/filtros observáveis e origem por métrica.

## Autoridade e proveniência

| Camada | Autoridade / obrigação |
| --- | --- |
| Sleeper | Liga, roster, identidade canônica e scoring oficial. IDs ESPN/NFL nunca inferidos do ID Sleeper. |
| Yardline | Cálculos derivados: regra aplicada, inputs, breakdown, versão, confiança e timestamps. |
| NFL / Yahoo | Conteúdo editorial: fonte, autor quando disponível, URL canônica e data real. |
| FantasyPros audit | Referência de comportamento/UX; não fonte de dados licenciados nem autorização de copiar assets. |

## Evidência e fila operacional

- `server/data/agent-handoffs/handoffs.json` e `server/data/agent-runtime/` são **runtime ignorado por Git**; não versionar bancos, logs brutos, URLs privadas ou relatórios runtime.
- Identidade de deduplicação/reabertura: **sourceAgent + checkId exato**, não título ou semelhança de feature.
- **RETRACTED** significa falso positivo do harness retirado da fila ativa, com evidência anterior preservada. Não é **VERIFIED** de produto. Se o mesmo check falhar de verdade, reabrir o mesmo handoff.
- Falha observada em modal hidratado permanece OPEN/ACKNOWLEDGED/IN_PROGRESS; um PASS isolado não resolve falha real.
- Console: manter logs e stack das exceções reais. Recursos/fontes externas bloqueados intencionalmente ou ambiente ausente ficam NOT_VERIFIABLE, não FAIL automático nem PASS fabricado.
- Leitura da fila não ativa escritores Antigravity, não distribui automaticamente, não faz push e não aprova release.

## Limites desta correção

O harness JSDOM verifica DOM/interações locais, não layout real, scroll visual, focus trap de browser, mobile, login, compra ou fluxos privados. Os oito contextos e toda profundidade/proveniência acima são **backlog explícito para implementação com dados reais**, não funcionalidade concluída.
