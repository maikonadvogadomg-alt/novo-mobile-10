# SK Code Editor â InformaÃ§Ãµes do Sistema

> Gerado em: 25/04/2026, 11:17:40
> Projeto: **Python Flask** Â· 129 arquivo(s)

---

## Terminal

O terminal executa JavaScript real no browser e simula comandos de sistema:

### O que funciona:
- `node <arquivo.js>` â executa JavaScript **real** (async/await suportado!)
- `fetch("https://api.exemplo.com")` â **acesso Ã  internet funcionando** para APIs com CORS
- `require('node-fetch')` ou `require('axios')` â usa fetch nativo do browser automaticamente
- `require('fs')` â lÃª e escreve arquivos do projeto virtual
- `npm install <pacote>` â atualiza package.json do projeto
- `ls`, `cat`, `mkdir`, `touch`, `rm`, `cp`, `mv` â operaÃ§Ãµes de arquivo
- `echo`, `pwd`, `clear`, `env` â utilitÃ¡rios
- `git status`, `git log` â informaÃ§Ãµes do projeto

### Sobre acesso Ã  internet:
- â APIs pÃºblicas com CORS habilitado: OpenAI, GitHub, JSONPlaceholder, etc.
- â `fetch("https://api.github.com/users/nome")` funciona direto
- â ï¸  Algumas APIs bloqueiam chamadas do browser (CORS) â nesses casos use um backend real
- â WebSockets e streams em tempo real nÃ£o funcionam no modo browser

### Sobre Python:
- `python <arquivo.py>` â **simulado** (mostra prints estÃ¡ticos)
- Para Python real: use Replit, Google Colab, ou instale localmente

---

## Assistente IA

### Escopos de contexto:
| Escopo | O que Ã© enviado | Tokens estimados |
|--------|----------------|-----------------|
| Projeto | AtÃ© 60 arquivos (10k chars cada, total 80k) | ~40.000â200.000 |
| Pasta | Arquivos da pasta atual (12k chars cada) | ~3.000â30.000 |
| Arquivo | SÃ³ o arquivo ativo (40k chars) | ~500â10.000 |
| Nenhum | Apenas sua mensagem | ~100â500 |

### Limites por modelo (tokens de entrada):
| Modelo | Limite entrada | Limite saÃ­da |
|--------|--------------|-------------|
| GPT-4o | 128.000 tokens | 16.384 tokens |
| GPT-4o-mini | 128.000 tokens | 16.384 tokens |
| GPT-3.5-turbo | 16.385 tokens | 4.096 tokens |
| Claude 3.5 Sonnet | 200.000 tokens | 8.096 tokens |
| Claude 3 Haiku | 200.000 tokens | 4.096 tokens |
| Gemini 1.5 Pro | 1.000.000 tokens | 8.192 tokens |
| Gemini 1.5 Flash | 1.000.000 tokens | 8.192 tokens |

> 1 token â 4 caracteres em inglÃªs / â 3 caracteres em portuguÃªs

### Comandos que a IA entende:
- `filepath:caminho/arquivo.ext` â cria/atualiza arquivo no projeto
- Blocos ```bash``` â exibe botÃ£o "Executar no Terminal"
- VocÃª pode pedir: "crie", "corrija", "explique", "refatore", "adicione testes"

---

## Atalhos do Editor

| AÃ§Ã£o | Atalho |
|------|--------|
| Salvar | Ctrl+S / âS |
| Desfazer | Ctrl+Z |
| Refazer | Ctrl+Y / Ctrl+Shift+Z |
| Buscar | Ctrl+F |
| Substituir | Ctrl+H |
| Ir para linha | Ctrl+G |
| Formatar | Shift+Alt+F |
| Comentar linha | Ctrl+/ |
| Duplicar linha | Shift+Alt+â |
| Mover linha | Alt+â/â |
| Selecionar tudo | Ctrl+A |

---

## Armazenamento

- **Ãndice de projetos:** `localStorage['sk-editor-projects']` (apenas metadados)
- **Arquivos de cada projeto:** `localStorage['sk-proj-files-{id}']` (chave separada por projeto)
- **Projeto atual:** `localStorage['sk-editor-current']`
- **Auto-save:** a cada 8 segundos e em cada mudanÃ§a de arquivo
- **Capacidade:** projetos grandes suportados â cada projeto tem sua prÃ³pria cota de armazenamento
- **Backup seguro:** use âï¸ Backup no Google Drive para projetos maiores que 5MB
- **Exportar tudo:** Painel de Arquivos â Â·Â·Â· na raiz â Exportar como ZIP

---

## VersÃ£o

SK Code Editor Â· Editor de cÃ³digo mobile-first em portuguÃªs  
Monaco Editor + WebAssembly Terminal + IA integrada  
