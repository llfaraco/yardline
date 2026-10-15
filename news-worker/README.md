# Monitor de notícias NFL.com

Este é o primeiro bloco da nova aba de Notícias da YARDLINE. A fonte é exclusivamente a página oficial:

- `https://www.nfl.com/news`
- seção editorial `Latest` / `All News`

## O que o worker faz

1. Consulta a página oficial a cada cinco minutos.
2. Extrai links de artigos do próprio `NFL.com`.
3. Deduplica por URL canônica.
4. Mantém até 500 artigos no arquivo `data/nfl-news.json`.
5. Expõe os dados para a aplicação em `GET /api/news`.
6. Expõe estado operacional em `GET /health`.
7. Não copia o texto integral do artigo; mantém o link para leitura no NFL.com.

## Executar localmente

```bash
node news-worker/nfl-news-worker.mjs
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/api/news
```

Para testar com intervalo menor:

```bash
NFL_NEWS_POLL_MS=30000 node news-worker/nfl-news-worker.mjs
```

## Produção

O sandbox atual não é um ambiente 24/7: ele pode hibernar. Portanto, executar esse processo aqui não constitui monitoramento full-time. O worker precisa ser colocado no backend persistente da aplicação, com reinício automático e armazenamento persistente.

A implementação de produção deve adicionar:

- banco persistente em vez de JSON;
- fila ou lock para impedir duas coletas simultâneas;
- logs e alertas de falha;
- backoff quando o NFL.com estiver indisponível;
- cache HTTP e respeito às regras de acesso do site;
- associação dos artigos a jogadores por Sleeper ID/ESPN ID depois da coleta;
- publicação no endpoint interno consumido pela aba de Notícias.

A interface não deve acessar o NFL.com diretamente a cada abertura. Ela deve ler `/api/news` do backend YARDLINE.
