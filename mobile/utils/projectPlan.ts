import type { Project, ProjectFile } from "@/context/AppContext";

interface FileNode {
  name: string;
  path: string;
  language: string;
  size: number;
  lines: number;
}

interface ApiRoute {
  method: string;
  path: string;
  file: string;
}

interface ProjectPlan {
  name: string;
  totalFiles: number;
  totalLines: number;
  languages: Record<string, number>;
  tree: string;
  apiRoutes: ApiRoute[];
  entryPoints: string[];
  suggestions: string[];
  markdown: string;
}

const LANG_COLORS: Record<string, string> = {
  typescript: "Ã°ÂÂÂ·", javascript: "Ã°ÂÂÂ¡", python: "Ã°ÂÂÂ", html: "Ã°ÂÂÂ ",
  css: "Ã°ÂÂÂ", json: "Ã°ÂÂÂ", markdown: "Ã°ÂÂÂ", sql: "Ã°ÂÂÂÃ¯Â¸Â",
  bash: "Ã°ÂÂÂ¥Ã¯Â¸Â", go: "Ã°ÂÂÂ¹", rust: "Ã°ÂÂ¦Â", java: "Ã¢ÂÂ",
  plaintext: "Ã°ÂÂÂ", default: "Ã°ÂÂÂ",
};

function buildTree(files: ProjectFile[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const lines: string[] = [];
  for (const f of sorted) {
    const emoji = LANG_COLORS[f.language] || LANG_COLORS.default;
    lines.push(`${emoji} ${f.name}`);
  }
  return lines.join("\n");
}

function detectApiRoutes(files: ProjectFile[]): ApiRoute[] {
  const routes: ApiRoute[] = [];
  const routePatterns = [
    { regex: /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, isExpress: true },
    { regex: /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, isExpress: false },
    { regex: /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi, isExpress: true },
    { regex: /fetch\s*\(\s*['"`](\/[^'"`]+)['"`]/gi, isExpress: false },
  ];

  for (const file of files) {
    if (!["javascript", "typescript", "python"].includes(file.language)) continue;
    for (const { regex } of routePatterns) {
      let match;
      const r = new RegExp(regex.source, regex.flags);
      while ((match = r.exec(file.content)) !== null) {
        routes.push({
          method: match[1]?.toUpperCase() || "GET",
          path: match[2] || match[1],
          file: file.name,
        });
      }
    }
  }
  return routes.slice(0, 20);
}

function detectEntryPoints(files: ProjectFile[]): string[] {
  const entries: string[] = [];
  const entryNames = [
    "index.ts", "index.js", "main.ts", "main.js", "main.py",
    "app.ts", "app.js", "server.ts", "server.js", "index.html",
  ];
  for (const name of entryNames) {
    if (files.some((f) => f.name === name)) {
      entries.push(name);
    }
  }
  return entries;
}

function generateSuggestions(files: ProjectFile[], routes: ApiRoute[]): string[] {
  const suggestions: string[] = [];
  const hasReadme = files.some((f) => f.name.toLowerCase() === "readme.md");
  const hasGitignore = files.some((f) => f.name === ".gitignore");
  const hasPackageJson = files.some((f) => f.name === "package.json");
  const hasTests = files.some((f) => f.name.includes(".test.") || f.name.includes(".spec."));
  const hasEnv = files.some((f) => f.name === ".env" || f.name === ".env.example");

  if (!hasReadme) suggestions.push("Ã°ÂÂÂ Adicionar README.md com instruÃÂ§ÃÂµes do projeto");
  if (!hasGitignore) suggestions.push("Ã°ÂÂÂ« Adicionar .gitignore para evitar commits desnecessÃÂ¡rios");
  if (!hasTests) suggestions.push("Ã°ÂÂ§Âª Criar testes automatizados para as funcionalidades principais");
  if (!hasEnv && hasPackageJson) suggestions.push("Ã°ÂÂÂ Criar .env.example para variÃÂ¡veis de ambiente");
  if (routes.length > 5) suggestions.push("Ã°ÂÂÂ Documentar as rotas de API com exemplos de uso");
  if (files.length > 20) suggestions.push("Ã°ÂÂÂ Organizar arquivos em subpastas por funcionalidade");
  if (files.some((f) => f.language === "javascript" && files.some((g) => g.language === "typescript"))) {
    suggestions.push("Ã°ÂÂÂ· Migrar arquivos .js para TypeScript para maior seguranÃÂ§a de tipos");
  }
  if (suggestions.length === 0) suggestions.push("Ã¢ÂÂ Projeto bem estruturado! Continue assim.");
  return suggestions;
}

export function generateProjectPlan(project: Project): ProjectPlan {
  const files = project.files;
  const languages: Record<string, number> = {};
  let totalLines = 0;

  for (const f of files) {
    const lines = f.content.split("\n").length;
    totalLines += lines;
    languages[f.language] = (languages[f.language] || 0) + 1;
  }

  const tree = buildTree(files);
  const apiRoutes = detectApiRoutes(files);
  const entryPoints = detectEntryPoints(files);
  const suggestions = generateSuggestions(files, apiRoutes);

  const langSummary = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `${LANG_COLORS[lang] || "Ã°ÂÂÂ"} ${lang}: ${count} arquivo${count !== 1 ? "s" : ""}`)
    .join("\n");

  const routesSummary = apiRoutes.length > 0
    ? apiRoutes.map((r) => `  \`${r.method} ${r.path}\` Ã¢ÂÂ ${r.file}`).join("\n")
    : "  Nenhuma rota detectada";

  const entryPointsSummary = entryPoints.length > 0
    ? entryPoints.map((e) => `  Ã¢ÂÂ¢ ${e}`).join("\n")
    : "  Nenhum ponto de entrada detectado";

  const suggestionsSummary = suggestions.map((s) => `  ${s}`).join("\n");

  const markdown = `# Ã°ÂÂÂ Plano do Projeto: ${project.name}

**Gerado em:** ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}

---

## Ã°ÂÂÂ VisÃÂ£o Geral

| Item | Valor |
|------|-------|
| Total de arquivos | ${files.length} |
| Total de linhas | ${totalLines.toLocaleString()} |
| Linguagens | ${Object.keys(languages).length} |
| Rotas de API | ${apiRoutes.length} |

---

## Ã°ÂÂÂ³ ÃÂrvore de Arquivos

\`\`\`
${tree}
\`\`\`

---

## Ã°ÂÂÂ£Ã¯Â¸Â Linguagens

${langSummary}

---

## Ã°ÂÂÂ Pontos de Entrada

${entryPointsSummary}

---

## Ã°ÂÂÂ Rotas de API Detectadas

${routesSummary}

---

## Ã°ÂÂÂ¡ SugestÃÂµes de Melhoria

${suggestionsSummary}

---

## Ã°ÂÂÂ DescriÃÂ§ÃÂ£o

${project.description || "Sem descriÃÂ§ÃÂ£o."}

---

*Gerado pelo DevMobile IDE*
`;

  return {
    name: project.name,
    totalFiles: files.length,
    totalLines,
    languages,
    tree,
    apiRoutes,
    entryPoints,
    suggestions,
    markdown,
  };
}
