import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { TerminalLine } from "@/context/AppContext";

const SERVER_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const TERMINAL_API = SERVER_DOMAIN
  ? `https://${SERVER_DOMAIN}/api/terminal`
  : "";

const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 80;

const BUILT_IN_COMMANDS: Record<string, (args: string[]) => string> = {
  ajuda: () =>
    `Comandos disponÃÂ­veis:
  ajuda / help    Ã¢ÂÂ Esta ajuda
  limpar / clear  Ã¢ÂÂ Limpar terminal
  ls              Ã¢ÂÂ Listar arquivos do projeto
  cat [arquivo]   Ã¢ÂÂ Exibir conteÃÂºdo de arquivo
  echo [msg]      Ã¢ÂÂ Imprimir mensagem
  pwd             Ã¢ÂÂ DiretÃÂ³rio atual
  data / date     Ã¢ÂÂ Data e hora atual
  node -e [js]    Ã¢ÂÂ Executar JavaScript
  python -c [py]  Ã¢ÂÂ Executar Python (simulado)
  npm install     Ã¢ÂÂ Instalar pacote npm
  npm run [script]Ã¢ÂÂ Executar script npm
  pip install     Ã¢ÂÂ Instalar pacote Python
  git [cmd]       Ã¢ÂÂ Simular comando git`,
  help: () =>
    `Comandos disponÃÂ­veis:
  ajuda / help    Ã¢ÂÂ Esta ajuda
  limpar / clear  Ã¢ÂÂ Limpar terminal
  ls              Ã¢ÂÂ Listar arquivos do projeto
  cat [arquivo]   Ã¢ÂÂ Exibir conteÃÂºdo de arquivo
  echo [msg]      Ã¢ÂÂ Imprimir mensagem
  pwd             Ã¢ÂÂ DiretÃÂ³rio atual
  data / date     Ã¢ÂÂ Data e hora atual
  node -e [js]    Ã¢ÂÂ Executar JavaScript
  python -c [py]  Ã¢ÂÂ Executar Python (simulado)
  npm install     Ã¢ÂÂ Instalar pacote npm
  npm run [script]Ã¢ÂÂ Executar script npm
  pip install     Ã¢ÂÂ Instalar pacote Python
  git [cmd]       Ã¢ÂÂ Simular comando git`,
  pwd: () => "/workspace/projeto",
  data: () => new Date().toLocaleString("pt-BR"),
  date: () => new Date().toLocaleString("pt-BR"),
  echo: (args) => args.join(" "),
  whoami: () => "devmobile",
  uname: () => "Linux DevMobile 5.15 Android",
  env: () => "NODE_ENV=desenvolvimento\nHOME=/workspace\nUSER=devmobile",
  versao: () => "DevMobile Terminal v2.1 Ã¢ÂÂ SDK Expo 54",
  version: () => "DevMobile Terminal v2.1 Ã¢ÂÂ SDK Expo 54",
};

const QUICK_CMDS_SIMULATED = [
  { label: "npm install", cmd: "npm install" },
  { label: "npm run dev", cmd: "npm run dev" },
  { label: "npm run build", cmd: "npm run build" },
  { label: "npm init", cmd: "npm init -y" },
  { label: "git status", cmd: "git status" },
  { label: "git add .", cmd: "git add ." },
  { label: "git commit", cmd: "git commit -m " },
  { label: "git log", cmd: "git log" },
  { label: "ls", cmd: "ls" },
  { label: "ajuda", cmd: "ajuda" },
  { label: "limpar", cmd: "limpar" },
  { label: "node -e", cmd: "node -e " },
  { label: "python -c", cmd: "python -c " },
  { label: "pip install", cmd: "pip install " },
];

const QUICK_CMDS_SERVER = [
  { label: "ls -la", cmd: "ls -la" },
  { label: "node -e", cmd: "node -e \"console.log('OlÃÂ¡!')\"" },
  { label: "npm init -y", cmd: "npm init -y" },
  { label: "npm install express", cmd: "npm install express" },
  { label: "npm install", cmd: "npm install" },
  { label: "node index.js", cmd: "node index.js" },
  { label: "npm run dev", cmd: "npm run dev" },
  { label: "npm run start", cmd: "npm run start" },
  { label: "cat package.json", cmd: "cat package.json" },
  { label: "node --version", cmd: "node --version" },
  { label: "npm --version", cmd: "npm --version" },
  { label: "git init", cmd: "git init" },
  { label: "git status", cmd: "git status" },
  { label: "pwd", cmd: "pwd" },
  { label: "limpar", cmd: "limpar" },
];

export default function Terminal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    terminalSessions,
    activeTerminal,
    addTerminalLine,
    clearTerminal,
    addTerminalSession,
    setActiveTerminal,
    removeTerminalSession,
    activeProject,
  } = useApp();

  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showQuick, setShowQuick] = useState(false);
  const [serverMode, setServerMode] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem("terminal_server_mode").then((v) => {
      if (v === "1") setServerMode(true);
    });
  }, []);

  const toggleServerMode = useCallback(() => {
    setServerMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem("terminal_server_mode", next ? "1" : "0");
      return next;
    });
  }, []);

  const activeSession = terminalSessions.find((s) => s.id === activeTerminal);

  const bottomPad = insets.bottom + TAB_BAR_HEIGHT;

  useEffect(() => {
    if (terminalSessions.length === 0) {
      const s = addTerminalSession("Terminal 1");
      addTerminalLine(s.id, {
        type: "info",
        content: `Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
Ã¢ÂÂ   DevMobile Terminal  v2.1       Ã¢ÂÂ
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

Ã°ÂÂÂ± Modo Simulado  Ã¢ÂÂ comandos bÃÂ¡sicos offline
Ã°ÂÂÂ¥Ã¯Â¸Â Modo Node.js Real Ã¢ÂÂ executa no servidor real
   (alterne pelo botÃÂ£o [NODE] na barra de abas)

Projeto ativo: ${activeProject?.name || "(nenhum)"}
Digite 'ajuda' para ver os comandos.
`,
      });
    }
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  const execOnServer = useCallback(
    async (sessionId: string, command: string) => {
      if (!TERMINAL_API) {
        addTerminalLine(sessionId, {
          type: "error",
          content: "Servidor nÃÂ£o configurado (EXPO_PUBLIC_DOMAIN ausente).",
        });
        return;
      }
      setServerBusy(true);
      try {
        const res = await fetch(`${TERMINAL_API}/exec`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, sessionId }),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => `HTTP ${res.status}`);
          addTerminalLine(sessionId, { type: "error", content: `Erro do servidor: ${msg}` });
          return;
        }
        if (Platform.OS === "web" || !res.body) {
          const text = await res.text();
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            try {
              const parsed = JSON.parse(raw);
              if (parsed.done) break;
              if (parsed.type === "stdout") addTerminalLine(sessionId, { type: "output", content: parsed.data });
              else if (parsed.type === "stderr") addTerminalLine(sessionId, { type: "error", content: parsed.data });
              else if (parsed.type === "error") addTerminalLine(sessionId, { type: "error", content: parsed.data });
              else if (parsed.type === "exit" && parsed.data !== "0")
                addTerminalLine(sessionId, { type: "error", content: `\n[Processo encerrado com cÃÂ³digo ${parsed.data}]` });
            } catch {}
          }
        } else {
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              try {
                const parsed = JSON.parse(raw);
                if (parsed.done) { reader.cancel(); return; }
                if (parsed.type === "stdout") addTerminalLine(sessionId, { type: "output", content: parsed.data });
                else if (parsed.type === "stderr") addTerminalLine(sessionId, { type: "error", content: parsed.data });
                else if (parsed.type === "error") addTerminalLine(sessionId, { type: "error", content: parsed.data });
                else if (parsed.type === "exit" && parsed.data !== "0")
                  addTerminalLine(sessionId, { type: "error", content: `\n[Processo encerrado com cÃÂ³digo ${parsed.data}]` });
              } catch {}
            }
            scrollToEnd();
          }
        }
      } catch (e) {
        addTerminalLine(sessionId, {
          type: "error",
          content: `Erro de conexÃÂ£o: ${e instanceof Error ? e.message : String(e)}`,
        });
      } finally {
        setServerBusy(false);
        scrollToEnd();
      }
    },
    [addTerminalLine, scrollToEnd]
  );

  const uploadProjectToServer = useCallback(
    async (sessionId: string) => {
      if (!activeProject) {
        addTerminalLine(sessionId, { type: "error", content: "Nenhum projeto ativo. Abra um projeto primeiro." });
        return;
      }
      if (!TERMINAL_API) {
        addTerminalLine(sessionId, { type: "error", content: "Servidor nÃÂ£o configurado." });
        return;
      }
      addTerminalLine(sessionId, { type: "info", content: `Ã°ÂÂÂ¤ Enviando "${activeProject.name}" para o servidor...` });
      setServerBusy(true);
      try {
        const res = await fetch(`${TERMINAL_API}/write`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            files: activeProject.files.map((f) => ({
              path: f.name,
              content: f.content,
            })),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        addTerminalLine(sessionId, {
          type: "output",
          content: `Ã¢ÂÂ ${data.count} arquivo(s) enviados!\nÃ°ÂÂÂ Workspace: ${data.cwd}\n\nAgora rode: npm install && node index.js`,
        });
      } catch (e) {
        addTerminalLine(sessionId, {
          type: "error",
          content: `Erro ao enviar: ${e instanceof Error ? e.message : String(e)}`,
        });
      } finally {
        setServerBusy(false);
        scrollToEnd();
      }
    },
    [activeProject, addTerminalLine, scrollToEnd]
  );

  const simulateInstall = useCallback(
    (sessionId: string, pkg: string, tool: "npm" | "pip") => {
      const version = `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 10)}`;
      const deps = Math.floor(Math.random() * 80) + 20;
      const secs = (Math.random() * 8 + 4).toFixed(1);

      const extraDeps = Array.from({ length: Math.min(deps, 18) }, (_, i) => {
        const names = ["lodash","axios","express","react","typescript","eslint","prettier","chalk","dotenv","cors","uuid","moment","dayjs","zod","yup","bcrypt","jsonwebtoken","multer","nodemon","concurrently"];
        const v = `${Math.floor(Math.random()*5)+1}.${Math.floor(Math.random()*20)}.${Math.floor(Math.random()*9)}`;
        return `  ${(names[i % names.length] + "@" + v).padEnd(35)} ${(Math.random()*500+10).toFixed(0)} kB`;
      }).join("\n");
      const steps =
        tool === "npm"
          ? [
              { delay: 200,  type: "info" as const,   msg: `npm warn config production Use \`--omit=dev\` instead.` },
              { delay: 500,  type: "info" as const,   msg: `npm warn deprecated inflight@1.0.6: leaks memory, use lru-cache instead` },
              { delay: 750,  type: "info" as const,   msg: `npm warn deprecated glob@7.2.3: use glob@9+ instead` },
              { delay: 1000, type: "info" as const,   msg: `npm notice created a lockfile as package-lock.json. You should commit this file.` },
              { delay: 1300, type: "info" as const,   msg: `\nÃ°ÂÂÂ¦ Resolvendo ÃÂ¡rvore de dependÃÂªncias...` },
              { delay: 1700, type: "info" as const,   msg: `  Resolving: ${pkg}@latest` },
              { delay: 2000, type: "info" as const,   msg: `  ${pkg}@${version}` },
              { delay: 2300, type: "info" as const,   msg: `  Resolvidos ${deps} pacotes em 0.8s` },
              { delay: 2700, type: "info" as const,   msg: `\nÃ¢Â¬Â  Baixando pacotes do registry (registry.npmjs.org)...` },
              { delay: 3100, type: "info" as const,   msg: `  Progresso: Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ  30% (${Math.floor(deps * 0.3)}/${deps} pacotes)` },
              { delay: 3500, type: "info" as const,   msg: `  Progresso: Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ  60% (${Math.floor(deps * 0.6)}/${deps} pacotes)` },
              { delay: 3900, type: "info" as const,   msg: `  Progresso: Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ  90% (${Math.floor(deps * 0.9)}/${deps} pacotes)` },
              { delay: 4300, type: "info" as const,   msg: `  Progresso: Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ 100% (${deps}/${deps} pacotes)` },
              { delay: 4600, type: "info" as const,   msg: `\nPacotes baixados:\n${extraDeps}` },
              { delay: 5000, type: "info" as const,   msg: `\nÃ°ÂÂÂ Vinculando mÃÂ³dulos e binÃÂ¡rios...` },
              { delay: 5400, type: "info" as const,   msg: `  Linked: ${Math.floor(deps * 0.4)} binÃÂ¡rios` },
              { delay: 5800, type: "info" as const,   msg: `\nÃ¢ÂÂ  Executando scripts de instalaÃÂ§ÃÂ£o...` },
              { delay: 6200, type: "info" as const,   msg: `  > ${pkg}@${version} preinstall` },
              { delay: 6500, type: "info" as const,   msg: `  > node scripts/check-node-version.js` },
              { delay: 6800, type: "info" as const,   msg: `  > ${pkg}@${version} postinstall` },
              { delay: 7100, type: "info" as const,   msg: `  > node scripts/postinstall.js` },
              { delay: 7400, type: "info" as const,   msg: `  > node-gyp rebuild (optional, skipped)` },
              { delay: 7700, type: "info" as const,   msg: `\nÃ°ÂÂÂ Verificando integridade dos pacotes (SHA512)...` },
              { delay: 8100, type: "info" as const,   msg: `  Ã¢ÂÂ ${deps} pacotes verificados sem divergÃÂªncias` },
              { delay: 8500, type: "info" as const,   msg: `\nÃ°ÂÂÂ¡  Auditando vulnerabilidades (${deps} pacotes)...` },
              { delay: 9000, type: "info" as const,   msg: `  Consultando advisory database...` },
              { delay: 9400, type: "info" as const,   msg: `  found 0 vulnerabilities` },
              { delay: 9800, type: "output" as const, msg: `\nadded ${deps} packages, and audited ${deps + Math.floor(Math.random()*50)+10} packages in ${secs}s\n\n${Math.floor(deps/3)} packages are looking for funding\n  run \`npm fund\` for details\n\n+ ${pkg}@${version}\n\nÃ¢ÂÂ InstalaÃÂ§ÃÂ£o concluÃÂ­da com sucesso!` },
            ]
          : [
              { delay: 400,  type: "info" as const,   msg: `Collecting ${pkg}` },
              { delay: 900,  type: "info" as const,   msg: `  Downloading ${pkg}-${version}-py3-none-any.whl (${Math.floor(Math.random() * 900) + 100} kB)` },
              { delay: 1500, type: "info" as const,   msg: `     Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ ${(Math.random() * 900 + 100).toFixed(0)} kB ${(Math.random() * 2 + 1).toFixed(1)} MB/s` },
              { delay: 2200, type: "info" as const,   msg: `Collecting dependÃÂªncias de ${pkg}` },
              { delay: 3000, type: "info" as const,   msg: `  Downloading ${Math.floor(Math.random() * 5) + 1} pacotes adicionais...` },
              { delay: 3800, type: "info" as const,   msg: `Installing collected packages: ${pkg}` },
              { delay: 4600, type: "info" as const,   msg: `  Running setup.py install for ${pkg} ... done` },
              { delay: 5400, type: "info" as const,   msg: `  Attempting uninstall: pip` },
              { delay: 6000, type: "info" as const,   msg: `    Found existing installation: pip 23.3.1` },
              { delay: 6600, type: "info" as const,   msg: `    Uninstalling pip-23.3.1:` },
              { delay: 7200, type: "info" as const,   msg: `      Successfully uninstalled pip-23.3.1` },
              { delay: 8000, type: "output" as const, msg: `\nSuccessfully installed ${pkg}-${version}\n\nÃ¢ÂÂ InstalaÃÂ§ÃÂ£o concluÃÂ­da com sucesso!` },
            ];

      steps.forEach(({ delay, type, msg }) => {
        setTimeout(() => {
          addTerminalLine(sessionId, { type, content: msg });
          scrollToEnd();
        }, delay);
      });
    },
    [addTerminalLine, scrollToEnd]
  );

  const runCommand = useCallback(
    async (cmd: string) => {
      if (!activeSession) return;
      const trimmed = cmd.trim();
      if (!trimmed) return;

      setCommandHistory((prev) => [trimmed, ...prev.slice(0, 99)]);
      setHistoryIndex(-1);

      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();

      if (command === "limpar" || command === "clear") {
        clearTerminal(activeSession.id);
        return;
      }

      addTerminalLine(activeSession.id, { type: "input", content: `$ ${trimmed}` });
      scrollToEnd();

      if (serverMode) {
        await execOnServer(activeSession.id, trimmed);
        return;
      }

      const args = parts.slice(1);

      // ls
      if (command === "ls") {
        if (!activeProject || activeProject.files.length === 0) {
          addTerminalLine(activeSession.id, { type: "output", content: "(nenhum arquivo no projeto ativo)" });
        } else {
          const listing = activeProject.files
            .map((f) => `  ${f.name.padEnd(30)} ${(f.content.length / 1024).toFixed(1)} KB`)
            .join("\n");
          addTerminalLine(activeSession.id, { type: "output", content: `total ${activeProject.files.length}\n${listing}` });
        }
        return;
      }

      // cat
      if (command === "cat" && args[0]) {
        const file = activeProject?.files.find(
          (f) => f.name === args[0] || f.name === args.join(" ")
        );
        if (file) {
          addTerminalLine(activeSession.id, {
            type: "output",
            content: `=== ${file.name} (${file.language}) ===\n${file.content}`,
          });
        } else {
          addTerminalLine(activeSession.id, {
            type: "error",
            content: `cat: ${args[0]}: Arquivo nÃÂ£o encontrado`,
          });
        }
        return;
      }

      // node -e
      if (command === "node" && args[0] === "-e") {
        const code = args.slice(1).join(" ");
        if (!code) {
          addTerminalLine(activeSession.id, { type: "error", content: "Uso: node -e <cÃÂ³digo JavaScript>" });
          return;
        }
        try {
          const logs: string[] = [];
          const fakeConsole = {
            log: (...a: unknown[]) => logs.push(a.map(String).join(" ")),
            error: (...a: unknown[]) => logs.push("ERRO: " + a.map(String).join(" ")),
            warn: (...a: unknown[]) => logs.push("AVISO: " + a.map(String).join(" ")),
          };
          const fn = new Function("console", "require", code);
          const fakeRequire = (mod: string) => {
            throw new Error(`require('${mod}') nÃÂ£o disponÃÂ­vel no simulador. Use npm install no projeto real.`);
          };
          const result = fn(fakeConsole, fakeRequire);
          const out = [...logs, result !== undefined ? `=> ${JSON.stringify(result)}` : ""].filter(Boolean).join("\n");
          addTerminalLine(activeSession.id, { type: "output", content: out || "(sem saÃÂ­da)" });
        } catch (e: unknown) {
          addTerminalLine(activeSession.id, {
            type: "error",
            content: `Erro: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
        return;
      }

      // node (sem -e)
      if (command === "node" && !args[0]) {
        addTerminalLine(activeSession.id, {
          type: "info",
          content: "Node.js v20.0.0 (simulado)\nUse: node -e <cÃÂ³digo>\nExemplo: node -e \"console.log('OlÃÂ¡!')\"",
        });
        return;
      }

      // git
      if (command === "git") {
        const subcmd = args[0] || "";
        const responses: Record<string, string> = {
          status: `No branch main\nSeu branch estÃÂ¡ atualizado com 'origin/main'.\n\nNada para fazer commit, ÃÂ¡rvore de trabalho limpa`,
          log: `commit abc1234def5678 (HEAD -> main, origin/main)\nAutor: Dev <dev@devmobile.app>\nData:   ${new Date().toDateString()}\n\n    Commit inicial\n\ncommit 9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0\nAutor: Dev <dev@devmobile.app>\nData:   ${new Date(Date.now() - 86400000).toDateString()}\n\n    ConfiguraÃÂ§ÃÂ£o inicial`,
          branch: "* main\n  desenvolver\n  feature/nova-funcionalidade",
          init: "RepositÃÂ³rio Git vazio iniciado em /workspace/projeto/.git/",
          add: `Adicionado ao stage: ${args.slice(1).join(" ") || "."}`,
          commit: `[main ${Math.random().toString(36).substr(2, 7)}] ${args.slice(2).join(" ") || "AtualizaÃÂ§ÃÂ£o"}\n 1 arquivo alterado`,
          push: "Enumerando objetos: feito.\nContando objetos: feito.\nCompressÃÂ£o delta: feito.\nPara origin/main: Ã¢ÂÂ ConcluÃÂ­do.",
          pull: `De origin/main\n * branch main -> FETCH_HEAD\nJÃÂ¡ estÃÂ¡ atualizado.`,
          clone: `Clonando em '${args[1]?.split("/").pop()?.replace(".git", "") || "repo"}'...\nRecebendo objetos: 100% Ã¢ÂÂ ConcluÃÂ­do.`,
          diff: `diff --git a/index.js b/index.js\n--- a/index.js\n+++ b/index.js\n@@ -1 +1 @@\n(sem alteraÃÂ§ÃÂµes)`,
          stash: "DiretÃÂ³rio de trabalho salvo: WIP no branch main",
          fetch: "De origin\n * branch main -> FETCH_HEAD\nÃ¢ÂÂ Fetch concluÃÂ­do",
          merge: `Atualizando abc1234..def5678\nFast-forward\nÃ¢ÂÂ Merge concluÃÂ­do`,
          checkout: `Alternado para o branch '${args[1] || "main"}'`,
          remote: `origin  https://github.com/usuario/repo.git (fetch)\norigin  https://github.com/usuario/repo.git (push)`,
        };
        const output = responses[subcmd] || `git: '${subcmd}' nÃÂ£o ÃÂ© um comando git conhecido\nTente: status, add, commit, push, pull, log, branch, clone, init, diff`;
        addTerminalLine(activeSession.id, { type: "output", content: output });
        return;
      }

      // npm
      if (command === "npm") {
        const subcmd = args[0];
        if (subcmd === "install" || subcmd === "i") {
          const pkg = args[1] || "dependÃÂªncias";
          addTerminalLine(activeSession.id, { type: "info", content: `\n> npm install ${pkg}\n` });
          simulateInstall(activeSession.id, pkg, "npm");
          return;
        }
        if (subcmd === "uninstall" || subcmd === "remove" || subcmd === "rm") {
          const pkg = args[1] || "pacote";
          addTerminalLine(activeSession.id, { type: "output", content: `removido 1 pacote\n- ${pkg}\nÃ¢ÂÂ DesinstalaÃÂ§ÃÂ£o concluÃÂ­da` });
          return;
        }
        if (subcmd === "run") {
          const script = args[1];
          if (!script) {
            addTerminalLine(activeSession.id, { type: "error", content: "npm run: especifique um script (ex: npm run dev)" });
            return;
          }
          addTerminalLine(activeSession.id, { type: "info", content: `\n> ${script}\n` });
          type Step = { delay: number; type: "info" | "output" | "error"; msg: string };
          const scriptSteps: Record<string, Step[]> = {
            dev: [
              { delay: 300,  type: "info",   msg: "  VITE v5.2.0  ready in 284 ms" },
              { delay: 800,  type: "info",   msg: "  Ã¢ÂÂ  Local:   http://localhost:3000/" },
              { delay: 1100, type: "info",   msg: "  Ã¢ÂÂ  Network: http://192.168.1.100:3000/" },
              { delay: 1400, type: "info",   msg: "  Ã¢ÂÂ  press h + enter to show help" },
              { delay: 2500, type: "info",   msg: "  [HMR] conectado ao servidor de desenvolvimento" },
              { delay: 3000, type: "info",   msg: "  [HMR] aguardando alteraÃÂ§ÃÂµes de arquivo..." },
              { delay: 3500, type: "output", msg: "\nÃ¢ÂÂ Servidor de desenvolvimento rodando!\n   Acesse: http://localhost:3000\n   Ctrl+C para parar." },
            ],
            build: [
              { delay: 300,  type: "info",   msg: "vite v5.2.0 building for production..." },
              { delay: 900,  type: "info",   msg: "  transformando arquivos..." },
              { delay: 1600, type: "info",   msg: `  Ã¢ÂÂ ${Math.floor(Math.random() * 100) + 50} mÃÂ³dulos transformados.` },
              { delay: 2400, type: "info",   msg: "  renderizando rotas..." },
              { delay: 3200, type: "info",   msg: "  minificando cÃÂ³digo (terser)..." },
              { delay: 4500, type: "info",   msg: "  comprimindo assets..." },
              { delay: 5500, type: "info",   msg: "dist/index.html                   1.23 kB Ã¢ÂÂ gzip:  0.65 kB" },
              { delay: 5700, type: "info",   msg: "dist/assets/index-BfVnlHhN.css   12.45 kB Ã¢ÂÂ gzip:  3.21 kB" },
              { delay: 5900, type: "info",   msg: "dist/assets/index-C4Zh8vXr.js   142.3  kB Ã¢ÂÂ gzip: 46.14 kB" },
              { delay: 6400, type: "output", msg: `\nÃ¢ÂÂ Build concluÃÂ­do em ${(Math.random() * 5 + 3).toFixed(2)}s\n\nÃ¢ÂÂ Arquivos prontos em /dist` },
            ],
            start: [
              { delay: 400,  type: "info",   msg: "Iniciando servidor Node.js..." },
              { delay: 1000, type: "info",   msg: `Servidor ouvindo na porta 3000` },
              { delay: 1500, type: "info",   msg: "Banco de dados conectado." },
              { delay: 2000, type: "output", msg: "\nÃ¢ÂÂ Servidor rodando em http://localhost:3000" },
            ],
            test: [
              { delay: 400,  type: "info",   msg: "JEST v29 rodando testes..." },
              { delay: 900,  type: "info",   msg: "  PASS src/utils.test.js (0.45s)" },
              { delay: 1400, type: "info",   msg: "  PASS src/components/App.test.js (1.12s)" },
              { delay: 1900, type: "info",   msg: "  PASS src/api/index.test.js (0.78s)" },
              { delay: 2500, type: "output", msg: "\nTest Suites: 3 passed, 3 total\nTests:       12 passed, 12 total\nSnapshots:   0 total\nTime:        2.351s\n\nÃ¢ÂÂ Todos os testes passaram!" },
            ],
            lint: [
              { delay: 400,  type: "info",   msg: "ESLint verificando arquivos..." },
              { delay: 1200, type: "info",   msg: "  src/index.js Ã¢ÂÂ ok" },
              { delay: 1600, type: "info",   msg: "  src/App.js Ã¢ÂÂ ok" },
              { delay: 2000, type: "output", msg: "\nÃ¢ÂÂ Nenhum erro encontrado. (0 erros, 0 avisos)" },
            ],
          };
          const steps: Step[] = scriptSteps[script] ?? [
            { delay: 500, type: "info", msg: `Executando script: ${script}...` },
            { delay: 1500, type: "output", msg: `\nÃ¢ÂÂ Script '${script}' concluÃÂ­do com cÃÂ³digo 0` },
          ];
          steps.forEach(({ delay, type, msg }) => {
            setTimeout(() => {
              addTerminalLine(activeSession.id!, { type, content: msg });
              scrollToEnd();
            }, delay);
          });
          return;
        }
        if (subcmd === "list" || subcmd === "ls") {
          addTerminalLine(activeSession.id, { type: "output", content: "projeto@1.0.0 /workspace/projeto\nÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ (sem dependÃÂªncias instaladas)" });
          return;
        }
        if (subcmd === "init") {
          addTerminalLine(activeSession.id, { type: "output", content: "Escrito em /workspace/projeto/package.json\nÃ¢ÂÂ npm init concluÃÂ­do" });
          return;
        }
        if (subcmd === "update") {
          const pkg = args[1] || "todos os pacotes";
          addTerminalLine(activeSession.id, { type: "info", content: `Atualizando ${pkg}...` });
          setTimeout(() => {
            addTerminalLine(activeSession.id!, { type: "output", content: `Ã¢ÂÂ ${pkg} atualizado com sucesso` });
            scrollToEnd();
          }, 1200);
          return;
        }
        addTerminalLine(activeSession.id, { type: "output", content: `npm ${subcmd}: executado` });
        return;
      }

      // pip
      if (command === "pip" || command === "pip3") {
        const subcmd = args[0];
        if (subcmd === "install") {
          const pkg = args.slice(1).join(" ") || "pacote";
          addTerminalLine(activeSession.id, { type: "info", content: `\n> pip install ${pkg}\n` });
          simulateInstall(activeSession.id, pkg, "pip");
          return;
        }
        if (subcmd === "list") {
          addTerminalLine(activeSession.id, {
            type: "output",
            content: "Pacote        VersÃÂ£o\n------------- ------\npip           23.3.1\nsetuptools    68.0.0\nwheel         0.41.0",
          });
          return;
        }
        if (subcmd === "freeze") {
          addTerminalLine(activeSession.id, { type: "output", content: "pip==23.3.1\nsetuptools==68.0.0" });
          return;
        }
        if (subcmd === "uninstall") {
          const pkg = args[1] || "pacote";
          addTerminalLine(activeSession.id, { type: "output", content: `Ã¢ÂÂ ${pkg} desinstalado com sucesso` });
          return;
        }
        addTerminalLine(activeSession.id, { type: "output", content: `pip ${subcmd}: executado` });
        return;
      }

      // python / python3
      if (command === "python" || command === "python3") {
        if (args[0] === "-c") {
          const code = args.slice(1).join(" ");
          if (!code) {
            addTerminalLine(activeSession.id, { type: "error", content: "Uso: python -c <cÃÂ³digo>\nExemplo: python -c \"print('OlÃÂ¡ Mundo')\"" });
            return;
          }
          const printMatch = code.match(/print\s*\(\s*['"](.*?)['"]\s*\)/);
          if (printMatch) {
            addTerminalLine(activeSession.id, { type: "output", content: printMatch[1] });
            return;
          }
          const calcMatch = code.match(/print\s*\((.+)\)/);
          if (calcMatch) {
            try {
              const result = Function('"use strict"; return (' + calcMatch[1] + ')')();
              addTerminalLine(activeSession.id, { type: "output", content: String(result) });
            } catch {
              addTerminalLine(activeSession.id, { type: "info", content: `(Python simulado)\n>> ${code}` });
            }
            return;
          }
          addTerminalLine(activeSession.id, { type: "info", content: `(Python simulado)\n>> ${code}` });
          return;
        }
        addTerminalLine(activeSession.id, {
          type: "output",
          content: "Python 3.11.0 (simulado Ã¢ÂÂ DevMobile)\nDigite: python -c <cÃÂ³digo>",
        });
        return;
      }

      // builtins
      const builtin = BUILT_IN_COMMANDS[command];
      if (builtin) {
        addTerminalLine(activeSession.id, { type: "output", content: builtin(args) });
        return;
      }

      // comando desconhecido
      addTerminalLine(activeSession.id, {
        type: "error",
        content: `bash: ${command}: comando nÃÂ£o encontrado\nDica: digite 'ajuda' para ver os comandos disponÃÂ­veis`,
      });
    },
    [activeSession, activeProject, addTerminalLine, clearTerminal, simulateInstall, scrollToEnd, serverMode, execOnServer]
  );

  const handleSubmit = () => {
    if (input.trim()) {
      runCommand(input);
      setInput("");
    }
  };

  const handleHistoryUp = () => {
    const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
    setHistoryIndex(newIndex);
    if (commandHistory[newIndex]) setInput(commandHistory[newIndex]);
  };

  const handleHistoryDown = () => {
    const newIndex = Math.max(historyIndex - 1, -1);
    setHistoryIndex(newIndex);
    setInput(newIndex === -1 ? "" : commandHistory[newIndex]);
  };

  const renderLine = ({ item }: { item: TerminalLine }) => {
    const color =
      item.type === "input"
        ? colors.primary
        : item.type === "error"
          ? colors.destructive
          : item.type === "info"
            ? colors.info
            : colors.foreground;
    return (
      <Text
        style={[
          styles.line,
          {
            color,
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            fontSize: 13,
            backgroundColor: item.type === "error" ? colors.destructive + "18" : undefined,
            borderLeftWidth: item.type === "input" ? 2 : 0,
            borderLeftColor: colors.primary,
            paddingLeft: item.type === "input" ? 6 : 2,
          },
        ]}
        selectable
      >
        {item.content}
      </Text>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.terminalBg }]}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={TAB_BAR_HEIGHT}
    >
      {/* Session Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 4 }}>
            {terminalSessions.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setActiveTerminal(s.id)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: s.id === activeTerminal ? colors.secondary : "transparent",
                    borderColor: s.id === activeTerminal ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name="terminal"
                  size={11}
                  color={s.id === activeTerminal ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: s.id === activeTerminal ? colors.primary : colors.mutedForeground },
                  ]}
                >
                  {s.name}
                </Text>
                {terminalSessions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeTerminalSession(s.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={10} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <TouchableOpacity
          onPress={() => {
            const s = addTerminalSession(`Terminal ${terminalSessions.length + 1}`);
            addTerminalLine(s.id, {
              type: "info",
              content: `DevMobile Terminal Ã¢ÂÂ ${new Date().toLocaleString("pt-BR")}\nDigite 'ajuda' para os comandos.\n`,
            });
          }}
          style={styles.addTab}
        >
          <Feather name="plus" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => activeSession && clearTerminal(activeSession.id)}
          style={styles.addTab}
        >
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={scrollToEnd}
          style={styles.addTab}
        >
          <Feather name="chevrons-down" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleServerMode}
          style={[
            styles.addTab,
            {
              backgroundColor: serverMode ? "#00d4aa22" : "transparent",
              borderRadius: 6,
              marginRight: 4,
              paddingHorizontal: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            },
          ]}
        >
          <Text style={{ fontSize: 10, color: serverMode ? "#00d4aa" : colors.mutedForeground, fontWeight: "700" }}>
            {serverMode ? "Ã°ÂÂÂ¥Ã¯Â¸Â NODE" : "Ã°ÂÂÂ± SIM"}
          </Text>
        </TouchableOpacity>
      </View>

      {serverMode && (
        <View style={[styles.serverBanner, { backgroundColor: "#00d4aa18", borderColor: "#00d4aa55" }]}>
          <Text style={{ color: "#00d4aa", fontSize: 11, fontWeight: "600", flex: 1 }}>
            {serverBusy ? "Ã¢ÂÂ³ Executando..." : "Ã°ÂÂÂ¥Ã¯Â¸Â Modo Node.js Real Ã¢ÂÂ comandos executam no servidor"}
          </Text>
          {serverBusy && <ActivityIndicator size="small" color="#00d4aa" />}
          {!serverBusy && activeProject && (
            <TouchableOpacity
              onPress={() => activeSession && uploadProjectToServer(activeSession.id)}
              style={{ backgroundColor: "#00d4aa33", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}
            >
              <Text style={{ color: "#00d4aa", fontSize: 11, fontWeight: "700" }}>Ã°ÂÂÂ¤ Carregar Projeto</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* SaÃÂ­da */}
      <FlatList
        ref={listRef}
        data={activeSession?.history ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderLine}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
        onContentSizeChange={scrollToEnd}
        onLayout={scrollToEnd}
        ListEmptyComponent={
          <Text style={[styles.line, { color: colors.mutedForeground, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>
            Terminal vazio. Execute um comando abaixo.{"\n"}Digite 'ajuda' para ver os comandos disponÃÂ­veis.
          </Text>
        }
      />

      {/* Comandos rÃÂ¡pidos */}
      {showQuick && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.quickBar, { backgroundColor: colors.card, borderColor: colors.border }]}
          contentContainerStyle={{ paddingHorizontal: 8, gap: 6, alignItems: "center" }}
        >
          {(serverMode ? QUICK_CMDS_SERVER : QUICK_CMDS_SIMULATED).map(({ label, cmd }) => (
            <TouchableOpacity
              key={cmd}
              onPress={() => {
                setInput(cmd);
                setShowQuick(false);
                inputRef.current?.focus();
              }}
              style={[styles.quickBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Text style={[styles.quickText, { color: colors.foreground, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Campo de entrada fixo */}
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          {/* Ã¢ÂÂ¡ Comandos rÃÂ¡pidos */}
          <TouchableOpacity
            onPress={() => setShowQuick((v) => !v)}
            style={[styles.histBtn, { backgroundColor: showQuick ? colors.primary + "33" : colors.secondary }]}
          >
            <Feather name="zap" size={13} color={showQuick ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>

          {/* Ã¢ÂÂ HistÃÂ³rico anterior */}
          <TouchableOpacity onPress={handleHistoryUp} style={[styles.histBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="chevron-up" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Prompt $ */}
          <Text style={[styles.prompt, { color: colors.primary, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>$</Text>

          {/* Campo de texto */}
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: colors.foreground,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                fontSize: 13,
              },
            ]}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSubmit}
            returnKeyType="send"
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Digite um comando..."
            placeholderTextColor={colors.mutedForeground}
          />

          {/* Ã¢ÂÂ HistÃÂ³rico prÃÂ³ximo */}
          <TouchableOpacity onPress={handleHistoryDown} style={[styles.histBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Executar Ã¢ÂÂµ */}
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.secondary }]}
          >
            <Feather name="corner-down-left" size={16} color={input.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 4,
    minHeight: 36,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  tabText: { fontSize: 11, fontWeight: "500" },
  addTab: { paddingHorizontal: 10, paddingVertical: 4 },
  line: { lineHeight: 20, paddingHorizontal: 2, marginBottom: 2 },
  serverBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 8,
  },
  quickBar: {
    maxHeight: 40,
    borderTopWidth: 1,
    paddingVertical: 4,
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
  },
  quickText: { fontSize: 11 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  prompt: { fontSize: 15, fontWeight: "bold" },
  input: { flex: 1, height: 36 },
  histBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
