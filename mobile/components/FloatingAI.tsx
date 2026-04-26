import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
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
import MessageRenderer from "@/components/MessageRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface PendingAction {
  type: "terminal" | "file_create" | "file_edit" | "file_delete" | "confirm";
  label: string;
  execute: () => void;
}

interface DBContextInfo {
  provider: string;
  connectionString: string;
  name: string;
}

interface ProjectTaskContext {
  title: string;
  status: "pendente" | "em_progresso" | "concluido";
  priority: "baixa" | "media" | "alta";
  description?: string;
}

function buildSystemPrompt(
  customPrompt?: string,
  projectName?: string,
  fileName?: string,
  fileContent?: string,
  dbConfigs?: DBContextInfo[],
  tasks?: ProjectTaskContext[]
): string {
  let prompt =
    "VocÃÂª ÃÂ© um assistente de desenvolvimento de software especializado. " +
    "Responda SEMPRE em portuguÃÂªs brasileiro, de forma clara e completa. " +
    "VocÃÂª estÃÂ¡ rodando dentro do DevMobile, um IDE mÃÂ³vel offline para Android. " +
    "O terminal do DevMobile ÃÂ© um simulador: npm, pip, git e node -e funcionam localmente no dispositivo. " +
    "Para execuÃÂ§ÃÂ£o real de servidores Node.js em produÃÂ§ÃÂ£o, o usuÃÂ¡rio deve gerar o APK via EAS Build.\n";

  // InstruÃÂ§ÃÂµes de banco de dados quando configurado
  if (dbConfigs && dbConfigs.length > 0) {
    const db = dbConfigs[0];
    const isNeon = db.provider === "neon";
    const isPostgres = db.provider === "postgres" || db.provider === "neon";

    prompt += `
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
Ã°ÂÂÂ  BANCO DE DADOS CONFIGURADO
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
Provedor: ${isNeon ? "Neon (PostgreSQL serverless)" : db.provider === "postgres" ? "PostgreSQL" : "SQLite"}
Nome: ${db.name}
DATABASE_URL: configurada Ã¢ÂÂ

VocÃÂª tem ACESSO COMPLETO a este banco de dados via instruÃÂ§ÃÂµes ao usuÃÂ¡rio.
Como assistente, vocÃÂª deve:

1. CRIAR TABELAS Ã¢ÂÂ quando pedido, gere o SQL completo de CREATE TABLE com:
   - Tipos corretos para PostgreSQL${isNeon ? " (Neon ÃÂ© 100% compatÃÂ­vel com PostgreSQL)" : ""}
   - PRIMARY KEY com SERIAL ou UUID
   - Constraints e ÃÂ­ndices adequados
   - Timestamps (created_at, updated_at)

2. MODIFICAR ESQUEMA Ã¢ÂÂ gere ALTER TABLE para adicionar/remover/modificar colunas

3. OPERAÃÂÃÂES CRUD Ã¢ÂÂ gere SQL para INSERT, SELECT, UPDATE, DELETE

4. MIGRATIONS Ã¢ÂÂ gere scripts de migraÃÂ§ÃÂ£o numerados (001_nome.sql, 002_nome.sql)

5. CONEXÃÂO NO CÃÂDIGO Ã¢ÂÂ gere cÃÂ³digo de conexÃÂ£o ${isPostgres ? "com 'pg' (node-postgres) ou 'postgres' (postgres.js)" : ""}:
   const { Pool } = require('pg');
   const pool = new Pool({ connectionString: process.env.DATABASE_URL });

6. ORM Ã¢ÂÂ se solicitado, gere configuraÃÂ§ÃÂ£o com Drizzle ORM, Prisma ou Sequelize

Formato para SQL executÃÂ¡vel:
[SQL]:
\`\`\`sql
-- Seu SQL aqui
\`\`\`

${isNeon ? `Dicas especÃÂ­ficas do Neon:
- Use psql "$(DATABASE_URL)" para conectar via terminal
- Neon suporta branching de banco (dev/prod separados)
- Use ssl: { rejectUnauthorized: false } na conexÃÂ£o Node.js
- Neon tem pool de conexÃÂµes via /pooler na URL` : ""}
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
`;
  } else {
    prompt += `
Para configurar um banco de dados (Neon, PostgreSQL):
1. VÃÂ¡ em ConfiguraÃÂ§ÃÂµes Ã¢ÂÂ Banco de Dados
2. Adicione a DATABASE_URL (ex: postgres://user:pass@host/db)
3. A IA receberÃÂ¡ instruÃÂ§ÃÂµes automÃÂ¡ticas para criar e gerenciar o banco.
`;
  }

  if (customPrompt?.trim()) {
    prompt += `\nInstruÃÂ§ÃÂµes adicionais do usuÃÂ¡rio:\n${customPrompt.trim()}\n`;
  }

  if (projectName) {
    prompt += `\nProjeto ativo: ${projectName}.`;
  }
  if (fileName && fileContent) {
    const preview = fileContent.substring(0, 2000);
    prompt += `\nArquivo atual: ${fileName}.\nConteÃÂºdo:\n${preview}${fileContent.length > 2000 ? "\n...(mostrando primeiros 2000 chars)" : ""}`;
  }

  // InjeÃÂ§ÃÂ£o de tarefas Taski
  if (tasks && tasks.length > 0) {
    const pendentes = tasks.filter((t) => t.status === "pendente");
    const emProgresso = tasks.filter((t) => t.status === "em_progresso");
    const concluidas = tasks.filter((t) => t.status === "concluido");

    const prioLabel: Record<string, string> = { alta: "Ã°ÂÂÂ´ Alta", media: "Ã°ÂÂÂ¡ MÃÂ©dia", baixa: "Ã¢ÂÂª Baixa" };
    const fmt = (t: ProjectTaskContext) =>
      `  Ã¢ÂÂ¢ [${prioLabel[t.priority]}] ${t.title}${t.description ? ` Ã¢ÂÂ ${t.description}` : ""}`;

    prompt += `
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
Ã°ÂÂÂ TAREFAS DO PROJETO (Taski)
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ`;

    if (emProgresso.length > 0) {
      prompt += `\nÃ°ÂÂÂµ EM PROGRESSO (${emProgresso.length}):\n${emProgresso.map(fmt).join("\n")}`;
    }
    if (pendentes.length > 0) {
      prompt += `\nÃ¢ÂÂ³ PENDENTES (${pendentes.length}):\n${pendentes.map(fmt).join("\n")}`;
    }
    if (concluidas.length > 0) {
      prompt += `\nÃ¢ÂÂ CONCLUÃÂDAS (${concluidas.length}):\n${concluidas.map(fmt).join("\n")}`;
    }

    prompt += `

Ã¢ÂÂ Ã¯Â¸Â  REGRAS CRÃÂTICAS PARA ESTA SESSÃÂO:
1. NÃÂO quebre nem remova funcionalidades marcadas como CONCLUÃÂDAS
2. Foque nas tarefas EM PROGRESSO antes de iniciar novas
3. Siga a prioridade: Alta Ã¢ÂÂ MÃÂ©dia Ã¢ÂÂ Baixa
4. Ao terminar uma tarefa, diga ao usuÃÂ¡rio para marcÃÂ¡-la como concluÃÂ­da no Taski
5. Antes de qualquer refatoraÃÂ§ÃÂ£o grande, confirme se nÃÂ£o afeta tarefas concluÃÂ­das
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
`;
  }

  prompt +=
    "\n\nRegras de formataÃÂ§ÃÂ£o:" +
    "\n- Quando sugerir comandos de terminal: [CMD] npm install express" +
    "\n- Quando sugerir SQL: prefixe com [SQL]: e use bloco ```sql" +
    "\n- Quando sugerir criar projeto: [CREATE_PROJECT]: nome | descriÃÂ§ÃÂ£o | linguagem" +
    "\n- NÃÂ£o limite suas respostas Ã¢ÂÂ responda completamente.";

  return prompt;
}

function extractCommands(text: string): string[] {
  const matches = text.match(/\[CMD\]\s*([^\n]+)/g) || [];
  return matches.map((m) => m.replace(/\[CMD\]\s*/, "").trim());
}

async function callAI(
  messages: Message[],
  systemPrompt: string,
  provider: {
    type: string;
    apiKey: string;
    baseUrl?: string;
    model?: string;
  }
): Promise<string> {
  const model =
    provider.model ||
    (provider.type === "anthropic"
      ? "claude-3-haiku-20240307"
      : provider.type === "gemini"
        ? "gemini-1.5-flash"
        : "gpt-4o-mini");

  const baseUrl =
    provider.baseUrl ||
    (provider.type === "anthropic"
      ? "https://api.anthropic.com"
      : provider.type === "gemini"
        ? "https://generativelanguage.googleapis.com/v1beta"
        : "https://api.openai.com");

  const msgs = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (provider.type === "anthropic") {
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: msgs,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "Erro Anthropic");
    return data.content?.[0]?.text || "Sem resposta.";
  }

  if (provider.type === "gemini") {
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Entendido!" }] },
      ...msgs.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];
    const res = await fetch(
      `${baseUrl}/models/${model}:generateContent?key=${provider.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 8192 },
        }),
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "Erro Gemini");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...msgs],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Erro API");
  return data.choices?.[0]?.message?.content || "Sem resposta.";
}

function speak(text: string, enabled: boolean) {
  if (!enabled || Platform.OS === "web") return;
  const clean = text
    .replace(/\[CMD\][^\n]*/g, "")
    .replace(/\[FILE\][^\n]*/g, "")
    .replace(/```[\s\S]*?```/g, "trecho de cÃÂ³digo")
    .replace(/[*_`#]/g, "")
    .trim();

  Speech.stop();
  Speech.speak(clean, {
    language: "pt-BR",
    rate: 0.9,
    pitch: 1.0,
  });
}

export default function FloatingAI() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    activeProject,
    activeFile,
    getActiveAIProvider,
    addTerminalLine,
    addTerminalSession,
    activeTerminal,
    createFile,
    updateFile,
    createProject,
    setActiveProject,
    settings,
    dbConfigs,
  } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "OlÃÂ¡! Sou seu assistente DevMobile. Posso ajudar com cÃÂ³digo, comandos e dÃÂºvidas. Como posso ajudar?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const native = Platform.OS !== "web";
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: native }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: native }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const toggleExpanded = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    const native = Platform.OS !== "web";
    Animated.spring(slideAnim, { toValue, useNativeDriver: native, tension: 80, friction: 10 }).start();
    setExpanded((v) => !v);
    if (!expanded) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(() => inputRef.current?.focus(), 400);
    } else {
      Speech.stop();
    }
  }, [expanded, slideAnim]);

  const panelTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const executeTerminalCommand = useCallback(
    (cmd: string) => {
      let sessionId = activeTerminal;
      if (!sessionId) {
        const s = addTerminalSession("IA Terminal");
        sessionId = s.id;
      }
      addTerminalLine(sessionId, { type: "input", content: `$ ${cmd}` });
      addTerminalLine(sessionId, { type: "info", content: `Executando: ${cmd}...` });
      setTimeout(() => {
        addTerminalLine(sessionId!, { type: "output", content: `Ã¢ÂÂ Comando enviado ao terminal.` });
      }, 600);
    },
    [activeTerminal, addTerminalLine, addTerminalSession]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const provider = getActiveAIProvider();
    if (!provider) {
      Alert.alert(
        "Sem provedor IA",
        "Configure uma chave de API na aba Config Ã¢ÂÂ Provedores IA."
      );
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(
        settings.systemPrompt,
        activeProject?.name,
        activeFile?.name,
        activeFile?.content,
        dbConfigs,
        activeProject?.tasks?.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          description: t.description,
        }))
      );

      const allMsgs = [...messages.filter((m) => m.id !== "welcome"), userMsg];
      const reply = await callAI(allMsgs.slice(-20), systemPrompt, provider);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speak(reply, ttsEnabled);

      const createProjectMatch = reply.match(/\[CREATE_PROJECT\]:\s*([^\|\n]+)\|([^\|\n]+)\|([^\n]+)/);
      if (createProjectMatch) {
        const projName = createProjectMatch[1].trim();
        const projDesc = createProjectMatch[2].trim();
        setPendingAction({
          type: "confirm",
          label: `Criar projeto "${projName}" (${projDesc})?`,
          execute: () => {
            const newProj = createProject(projName, projDesc);
            setActiveProject(newProj);
            setPendingAction(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (ttsEnabled) speak(`Projeto ${projName} criado com sucesso.`, true);
          },
        });
      } else {
        const cmds = extractCommands(reply);
        if (cmds.length > 0 && activeProject) {
          const cmd = cmds[0];
          setPendingAction({
            type: "terminal",
            label: `Executar: "${cmd}"?`,
            execute: () => {
              executeTerminalCommand(cmd);
              setPendingAction(null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              if (ttsEnabled) speak("Comando executado no terminal.", true);
            },
          });
        }
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Verifique sua conexÃÂ£o e API key.";
      const errMsgObj: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `Ã¢ÂÂ Ã¯Â¸Â Erro: ${errorMsg}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsgObj]);
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    messages,
    activeProject,
    activeFile,
    getActiveAIProvider,
    ttsEnabled,
    executeTerminalCommand,
    settings.systemPrompt,
    createProject,
    setActiveProject,
    dbConfigs,
  ]);

  const handleMicPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.focus();
    if (ttsEnabled) {
      speak("Fale sua mensagem usando o microfone do teclado.", true);
    }
    Alert.alert(
      "Entrada por voz",
      "Toque no ÃÂ­cone de microfone Ã°ÂÂÂ¤ no teclado para falar. O texto serÃÂ¡ transcrito automaticamente pelo Android.",
      [{ text: "OK", onPress: () => inputRef.current?.focus() }]
    );
  };

  const bottomOffset = Platform.OS === "web" ? 84 : insets.bottom + 60;

  if (!expanded) {
    return (
      <Animated.View
        style={[
          styles.bubble,
          {
            bottom: bottomOffset + 16,
            right: 16,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={toggleExpanded}
          style={[styles.bubbleBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Feather name="cpu" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.backdrop]}
        activeOpacity={1}
        onPress={toggleExpanded}
      />
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            bottom: bottomOffset,
            transform: [{ translateY: panelTranslateY }],
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.panelHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.panelHeaderLeft}>
            <View style={[styles.aiDot, { backgroundColor: colors.primary }]} />
            <View>
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>
                Assistente IA
              </Text>
              {activeProject && (
                <Text style={[styles.panelSub, { color: colors.mutedForeground }]}>
                  Contexto: {activeProject.name}
                  {activeFile ? ` / ${activeFile.name}` : ""}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.panelHeaderRight}>
            <TouchableOpacity
              onPress={() => {
                const newVal = !ttsEnabled;
                setTtsEnabled(newVal);
                if (!newVal) Speech.stop();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.iconBtn,
                { backgroundColor: ttsEnabled ? colors.primary + "33" : colors.secondary },
              ]}
            >
              <Feather
                name={ttsEnabled ? "volume-2" : "volume-x"}
                size={14}
                color={ttsEnabled ? colors.primary : colors.mutedForeground}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setMessages([{
                  id: "welcome",
                  role: "assistant",
                  content: "Conversa reiniciada. Como posso ajudar?",
                  timestamp: new Date().toISOString(),
                }]);
                setPendingAction(null);
                Speech.stop();
              }}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="rotate-ccw" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleExpanded}
              style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Mensagens */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.msgBubble,
                msg.role === "user"
                  ? [styles.userBubble, { backgroundColor: colors.primary }]
                  : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }],
              ]}
            >
              <MessageRenderer
                content={msg.content}
                isUser={msg.role === "user"}
                showApply={msg.role === "assistant"}
              />
            </View>
          ))}

          {loading && (
            <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.msgText, { color: colors.mutedForeground }]}>
                Pensando...
              </Text>
            </View>
          )}

          {pendingAction && (
            <View style={[styles.confirmBox, { backgroundColor: colors.warning + "22", borderColor: colors.warning }]}>
              <Text style={[styles.confirmText, { color: colors.foreground }]}>
                Ã¢ÂÂ Ã¯Â¸Â {pendingAction.label}
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  onPress={() => {
                    pendingAction.execute();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  style={[styles.confirmBtn, { backgroundColor: colors.success }]}
                >
                  <Feather name="check" size={12} color="#fff" />
                  <Text style={styles.confirmBtnText}>OK, executar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPendingAction(null)}
                  style={[styles.confirmBtn, { backgroundColor: colors.destructive }]}
                >
                  <Feather name="x" size={12} color="#fff" />
                  <Text style={styles.confirmBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {/* Microfone / Voz */}
          <TouchableOpacity
            onPress={handleMicPress}
            style={[styles.micBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="mic" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Colar da ÃÂ¡rea de transferÃÂªncia */}
          <TouchableOpacity
            onPress={async () => {
              try {
                const text = await Clipboard.getStringAsync();
                if (text) {
                  setInput((prev) => prev + text);
                  inputRef.current?.focus();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                  Alert.alert("ÃÂrea de transferÃÂªncia vazia", "Copie algum texto primeiro.");
                }
              } catch {
                Alert.alert("Erro", "NÃÂ£o foi possÃÂ­vel acessar a ÃÂ¡rea de transferÃÂªncia.");
              }
            }}
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="clipboard" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Campo de texto */}
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              {
                color: colors.foreground,
                backgroundColor: colors.secondary,
                borderColor: colors.border,
              },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Digite ou cole sua pergunta..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={2000}
            blurOnSubmit={false}
            returnKeyType="default"
          />

          {/* Enviar */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || loading}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !loading ? colors.primary : colors.secondary,
              },
            ]}
          >
            <Feather
              name="send"
              size={15}
              color={input.trim() && !loading ? colors.primaryForeground : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Floating button to close */}
      <Animated.View
        style={[
          styles.bubble,
          {
            bottom: bottomOffset + 16,
            right: 16,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const PANEL_HEIGHT = 380;

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    zIndex: 9999,
  },
  bubbleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 9000,
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    zIndex: 9998,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  panelHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  panelTitle: { fontSize: 13, fontWeight: "700" },
  panelSub: { fontSize: 10, marginTop: 1 },
  panelHeaderRight: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: { flex: 1 },
  messagesContent: {
    padding: 12,
    gap: 8,
    paddingBottom: 4,
  },
  msgBubble: {
    borderRadius: 12,
    padding: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "stretch",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  msgText: { fontSize: 13, lineHeight: 18 },
  confirmBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  confirmText: { fontSize: 12, lineHeight: 17 },
  confirmActions: { flexDirection: "row", gap: 8 },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 90,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
