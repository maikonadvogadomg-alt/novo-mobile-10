import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import React, { useCallback, useRef, useState } from "react";
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

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { AIProvider } from "@/context/AppContext";
import MessageRenderer from "@/components/MessageRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Auto-detect table: [prefix, baseUrl, defaultModel, displayName]
const AUTO_DETECT: [string, string, string, string][] = [
  ["gsk_",   "https://api.groq.com/openai/v1",                           "llama-3.3-70b-versatile",  "Groq"],
  ["sk-or-", "https://openrouter.ai/api/v1",                             "openai/gpt-4o-mini",       "OpenRouter"],
  ["pplx-",  "https://api.perplexity.ai",                                "sonar-pro",                "Perplexity"],
  ["AIza",   "https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-2.0-flash",         "Google Gemini"],
  ["xai-",   "https://api.x.ai/v1",                                      "grok-2-latest",            "xAI / Grok"],
  ["sk-ant", "https://api.anthropic.com/v1",                             "claude-haiku-4-20250514",  "Anthropic"],
  ["sk-",    "https://api.openai.com/v1",                                "gpt-4o-mini",              "OpenAI"],
];

function autoDetect(key: string): { url: string; model: string; name: string } | null {
  const k = (key || "").trim();
  for (const [prefix, url, model, name] of AUTO_DETECT) {
    if (k.startsWith(prefix)) return { url, model, name };
  }
  return null;
}

function getEndpoint(provider: AIProvider): { url: string; headers: Record<string, string> } {
  // Cortesia Gemini Ã¢ÂÂ proxy via Replit AI Integration (sem chave necessÃÂ¡ria)
  if (provider.type === "cortesia") {
    const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
    return {
      url: `https://${domain}/api/ai/chat`,
      headers: { "Content-Type": "application/json" },
    };
  }
  // Anthropic uses its own protocol
  if (provider.type === "anthropic") {
    return {
      url: (provider.baseUrl || "https://api.anthropic.com") + "/v1/messages",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
      },
    };
  }
  // All other providers (OpenAI, Groq, OpenRouter, Perplexity, Gemini OpenAI-compat, xAI, DeepSeek, Mistral, custom)
  // use the OpenAI-compatible /chat/completions format
  const detected = autoDetect(provider.apiKey);
  let base = provider.baseUrl?.replace(/\/$/, "");
  if (!base) {
    base = detected?.url?.replace(/\/$/, "") || "https://api.openai.com/v1";
  }
  const url = base.endsWith("/chat/completions") ? base : base + "/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${provider.apiKey}`,
  };
  if (provider.type === "openrouter") {
    headers["HTTP-Referer"] = "https://devmobile.app";
    headers["X-Title"] = "DevMobile IDE";
  }
  return { url, headers };
}

async function callAI(
  provider: AIProvider,
  messages: Message[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const { url, headers } = getEndpoint(provider);

  // Ã¢ÂÂÃ¢ÂÂ Cortesia Gemini Ã¢ÂÂ proxy SSE customizado Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  if (provider.type === "cortesia") {
    const systemMsg = messages.find(m => m.id === "system");
    const chatMsgs = messages.filter(m => m.id !== "system");
    const body = JSON.stringify({
      messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
      systemPrompt: systemMsg?.content,
      model: provider.model || "gemini-2.5-flash",
    });
    const response = await fetch(url, { method: "POST", headers, body });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Erro ao conectar: ${response.status}`);
    }

    const parseSSEText = (text: string) => {
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const j = line.slice(6).trim();
        try {
          const parsed = JSON.parse(j);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.content) onChunk(parsed.content);
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    };

    // No web (React Native Web no browser), o ReadableStream ÃÂ s vezes nÃÂ£o funciona;
    // usamos response.text() como fallback confiÃÂ¡vel.
    const useFullText = Platform.OS === "web" || !response.body;
    if (useFullText) {
      const text = await response.text();
      parseSSEText(text);
      return;
    }

    // Mobile native: streaming real
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const j = line.slice(6).trim();
        try {
          const parsed = JSON.parse(j);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.done) return;
          if (parsed.content) onChunk(parsed.content);
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
    return;
  }

  // Ã¢ÂÂÃ¢ÂÂ Demais provedores Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const model = provider.model || getDefaultModel(provider.type);
  let body: string;
  const isAnthropicNative = provider.type === "anthropic";

  if (isAnthropicNative) {
    const systemMsg = messages.find(m => m.id === "system");
    const chatMsgs = messages.filter(m => m.id !== "system");
    body = JSON.stringify({
      model,
      max_tokens: 16384,
      stream: true,
      system: systemMsg?.content,
      messages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
    });
  } else {
    body = JSON.stringify({
      model,
      stream: true,
      max_tokens: 16384,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  const response = await fetch(url, { method: "POST", headers, body });

  if (!response.ok) {
    const err = await response.text();
    let msg = `Erro ${response.status}`;
    try { const j = JSON.parse(err); msg = j.error?.message || j.error || j.message || msg; } catch {}
    throw new Error(msg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Sem stream disponÃÂ­vel");
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const j = line.slice(6).trim();
      if (j === "[DONE]") continue;
      try {
        const parsed = JSON.parse(j);
        if (parsed.error) throw new Error(parsed.error?.message || parsed.error);
        const text = isAnthropicNative
          ? (parsed.delta?.text || "")
          : (parsed.choices?.[0]?.delta?.content || "");
        if (text) onChunk(text);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

function getDefaultModel(type: AIProvider["type"]): string {
  switch (type) {
    case "openai":     return "gpt-4o-mini";
    case "anthropic":  return "claude-haiku-4-20250514";
    case "gemini":     return "gemini-2.0-flash";
    case "groq":       return "llama-3.3-70b-versatile";
    case "openrouter": return "openai/gpt-4o-mini";
    case "perplexity": return "sonar-pro";
    case "xai":        return "grok-2-latest";
    case "deepseek":   return "deepseek-chat";
    case "mistral":    return "mistral-small";
    default:           return "gpt-4o-mini";
  }
}

const AI_KEY_PROVIDERS: { type: AIProvider["type"]; label: string; hint: string }[] = [
  { type: "groq",       label: "Groq",       hint: "gsk_..." },
  { type: "openai",     label: "OpenAI",     hint: "sk-..." },
  { type: "anthropic",  label: "Claude",     hint: "sk-ant-..." },
  { type: "gemini",     label: "Gemini",     hint: "AIza..." },
  { type: "xai",        label: "xAI / Grok", hint: "xai-..." },
  { type: "openrouter", label: "OpenRouter", hint: "sk-or-..." },
  { type: "perplexity", label: "Perplexity", hint: "pplx-..." },
  { type: "deepseek",   label: "DeepSeek",   hint: "sk-..." },
];

function detectType(key: string): AIProvider["type"] {
  const d = autoDetect(key);
  if (!d) return "openai";
  if (d.name === "Groq")          return "groq";
  if (d.name === "OpenRouter")    return "openrouter";
  if (d.name === "Perplexity")    return "perplexity";
  if (d.name === "Google Gemini") return "gemini";
  if (d.name === "xAI / Grok")   return "xai";
  if (d.name === "Anthropic")     return "anthropic";
  return "openai";
}

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Chips de aÃÂ§ÃÂ£o rÃÂ¡pida (tela vazia) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const SUGGESTION_CHIPS = [
  { label: "Ã°ÂÂÂ¦ Instalar biblioteca",  msg: "Quero instalar uma biblioteca npm no meu projeto. Me ajude a escolher e instalar." },
  { label: "Ã°ÂÂÂ Criar plano",          msg: "Crie um plano de desenvolvimento passo a passo para o projeto atual." },
  { label: "Ã°ÂÂÂ Debugar erro",         msg: "Tenho um erro no cÃÂ³digo. Me ajude a identificar e corrigir o problema." },
  { label: "Ã¢ÂÂ¡ Executar projeto",     msg: "Como executo/testo este projeto? Qual o comando correto?" },
  { label: "Ã°ÂÂÂ Criar arquivo",        msg: "Preciso criar um novo arquivo no projeto. Me guie no processo." },
  { label: "Ã°ÂÂÂ Revisar cÃÂ³digo",       msg: "Revise o cÃÂ³digo do arquivo atual e sugira melhorias de qualidade e performance." },
  { label: "Ã°ÂÂÂ Adicionar .gitignore", msg: "Crie um .gitignore completo para este projeto." },
  { label: "Ã°ÂÂÂ Gerar README",         msg: "Gere um README.md profissional para este projeto." },
];

// Chips de resposta rÃÂ¡pida pÃÂ³s-mensagem IA
const QUICK_REPLIES = [
  { label: "Ã¢ÂÂ OK, pode fazer",     msg: "OK, pode fazer." },
  { label: "Ã¢ÂÂ NÃÂ£o",               msg: "NÃÂ£o, obrigado." },
  { label: "Ã¢ÂÂ¶ Continue",           msg: "Continue com o prÃÂ³ximo passo." },
  { label: "Ã°ÂÂÂ Tente de novo",     msg: "Tente de outro jeito." },
  { label: "Ã¢ÂÂ Explica melhor",    msg: "Pode explicar com mais detalhes?" },
];

type ChatMode = "dev" | "livre" | "juridico";

const CHAT_MODES: { key: ChatMode; label: string; icon: string; color: string; prompt: string }[] = [
  {
    key: "dev",
    label: "Dev",
    icon: "code",
    color: "#00d4aa",
    prompt: "",
  },
  {
    key: "livre",
    label: "Campo Livre",
    icon: "message-circle",
    color: "#6366f1",
    prompt: "VocÃÂª ÃÂ© uma IA de conversaÃÂ§ÃÂ£o livre, sem restriÃÂ§ÃÂµes temÃÂ¡ticas. Responda com naturalidade, clareza e sem julgamentos. O usuÃÂ¡rio pode perguntar qualquer coisa.",
  },
  {
    key: "juridico",
    label: "JurÃÂ­dico",
    icon: "book",
    color: "#f59e0b",
    prompt: "VocÃÂª ÃÂ© um assistente jurÃÂ­dico especializado em direito brasileiro. ForneÃÂ§a informaÃÂ§ÃÂµes legais claras, cite artigos de lei relevantes, e sempre recomende consultar um advogado para casos especÃÂ­ficos. Responda em portuguÃÂªs do Brasil.",
  },
];

export default function AIChat() {
  const colors = useColors();
  const { getActiveAIProvider, activeFile, activeProject, addAIProvider, aiMemory, settings } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickKey, setQuickKey] = useState("");
  const [showQuickKey, setShowQuickKey] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("dev");
  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSaveQuickKey = () => {
    const k = quickKey.trim();
    if (!k) return;
    const det = autoDetect(k);
    const type = detectType(k);
    addAIProvider({
      name: det?.name || AI_KEY_PROVIDERS.find(p => p.type === type)?.label || "OpenAI",
      type,
      apiKey: k,
      baseUrl: det?.url,
      model: det?.model,
      isActive: true,
    });
    setQuickKey("");
    setShowQuickKey(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const sendMessage = useCallback(async (overrideText?: string) => {
    const provider = getActiveAIProvider();
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    setShowQuickReplies(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: generateId(), role: "user", content: text };
    const assistantId = generateId();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    if (!overrideText) setInput("");
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    if (!provider) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Nenhum provedor de IA configurado. VÃÂ¡ em Configuracoes > IA e adicione uma chave de API.",
              }
            : m
        )
      );
      setIsLoading(false);
      return;
    }

    const modeConfig = CHAT_MODES.find((m) => m.key === chatMode)!;

    let systemContext: string;

    if (chatMode !== "dev") {
      systemContext = modeConfig.prompt;
    } else {
      systemContext = settings.systemPrompt?.trim()
        ? settings.systemPrompt
        : `VocÃÂª ÃÂ© um assistente de desenvolvimento profissional integrado ao DevMobile Ã¢ÂÂ um IDE no celular Android.

REGRAS DE COMPORTAMENTO (SEMPRE siga, sem exceÃÂ§ÃÂ£o):

1. FEEDBACK CONSTANTE: ApÃÂ³s cada aÃÂ§ÃÂ£o confirmada pelo usuÃÂ¡rio, informe SEMPRE o que foi feito + o prÃÂ³ximo passo sugerido. Nunca pare sem dar um prÃÂ³ximo passo.
   Exemplo: "Ã¢ÂÂ Biblioteca instalada. PrÃÂ³ximo: vou configurar o import no arquivo principal. Posso fazer isso?"

2. CONFIRMAÃÂÃÂES SIMPLES: Quando precisar de aprovaÃÂ§ÃÂ£o, termine com uma pergunta direta de Sim/NÃÂ£o. O usuÃÂ¡rio sÃÂ³ precisa dizer "OK" ou "NÃÂ£o".
   Exemplo: "Encontrei o problema. Posso corrigir as linhas 12-15? (OK / NÃÂ£o)"

3. AÃÂÃÂES CONCRETAS: Quando sugerir instalar uma biblioteca, mostrar o comando exato:
   \`npm install nome-da-biblioteca\`
   Depois de confirmado, mostre o prÃÂ³ximo passo automaticamente.

4. NUNCA PARE NO MEIO: Se o usuÃÂ¡rio disser "OK", "sim", "pode", "faz", "vai", "continue" Ã¢ÂÂ execute a aÃÂ§ÃÂ£o e jÃÂ¡ informe o resultado + prÃÂ³ximo passo.

5. CONTEXTO DO PROJETO: VocÃÂª tem acesso ao arquivo e projeto atual. Use esse contexto para dar respostas especÃÂ­ficas, nÃÂ£o genÃÂ©ricas.

6. FORMATO DAS RESPOSTAS:
   - Use Ã¢ÂÂ para aÃÂ§ÃÂµes concluÃÂ­das
   - Use Ã°ÂÂÂ para planos/passos
   - Use Ã¢ÂÂ Ã¯Â¸Â para avisos
   - Use Ã°ÂÂÂ¡ para sugestÃÂµes
   - Use blocos de cÃÂ³digo para comandos e cÃÂ³digo
   - Seja conciso mas completo Ã¢ÂÂ sem enrolar

7. INSTALAÃÂÃÂO DE BIBLIOTECAS: Sempre use npm (padrÃÂ£o). Mostre o comando, explique para que serve, e apÃÂ³s confirmaÃÂ§ÃÂ£o mostre como usar no cÃÂ³digo.

8. PLANO DE EXECUÃÂÃÂO: Para tarefas grandes, liste os passos numerados e peÃÂ§a confirmaÃÂ§ÃÂ£o para comeÃÂ§ar. Depois execute passo a passo dando feedback de cada um.`;

      if (activeFile) {
        systemContext += `\n\nÃ°ÂÂÂ ARQUIVO ATUAL: ${activeFile.name} (${activeFile.language})\n\`\`\`${activeFile.language}\n${activeFile.content.slice(0, 3000)}\n\`\`\``;
      }
      if (activeProject) {
        systemContext += `\n\nÃ°ÂÂÂ PROJETO: ${activeProject.name} (${activeProject.files.length} arquivo${activeProject.files.length !== 1 ? "s" : ""})`;
        if (activeProject.files.length > 0) {
          systemContext += `\nArquivos: ${activeProject.files.map(f => f.name).join(", ")}`;
        }
      }
    }

    if (aiMemory.length > 0) {
      const memStr = aiMemory.map((e) => `- [${e.category}] ${e.content}`).join("\n");
      systemContext += `\n\nÃ°ÂÂ§Â  MEMÃÂRIA DO USUÃÂRIO (use como contexto, nÃÂ£o mencione explicitamente):\n${memStr}`;
    }

    const allMessages: Message[] = [
      { id: "system", role: "user", content: systemContext },
      ...messages,
      userMsg,
    ];

    try {
      await callAI(provider, allMessages, (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      });
      // Mostra resposta rÃÂ¡pida apÃÂ³s IA responder com sucesso
      setShowQuickReplies(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        // GeraÃÂ§ÃÂ£o parada pelo usuÃÂ¡rio Ã¢ÂÂ nÃÂ£o mostra erro
        setShowQuickReplies(true);
      } else {
        const errMsg = e instanceof Error ? e.message : "Erro desconhecido";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Ã¢ÂÂ Ã¯Â¸Â ${errMsg}\n\nVerifique sua chave de API e tente novamente.` } : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [input, isLoading, messages, getActiveAIProvider, activeFile, activeProject]);

  const sendQuickReply = (msg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickReplies(false);
    sendMessage(msg);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
          {
            backgroundColor: isUser ? colors.primary : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {!isUser && (
          <View style={styles.aiLabel}>
            <Feather name="cpu" size={10} color={colors.accent} />
            <Text style={[styles.aiLabelText, { color: colors.accent }]}>IA</Text>
          </View>
        )}
        <MessageRenderer
          content={item.content || (isLoading && item.role === "assistant" ? "Pensando..." : "")}
          isUser={isUser}
          showApply={!isUser}
        />
      </View>
    );
  };

  const provider = getActiveAIProvider();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "web" ? 84 : 80}
    >
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Feather name="cpu" size={14} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Assistente IA</Text>
        {provider ? (
          <View style={[styles.providerBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.providerText, { color: colors.mutedForeground }]}>
              {provider.name}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowQuickKey(v => !v)}
            style={[styles.providerBadge, { backgroundColor: colors.warning + "22", borderColor: colors.warning, borderWidth: 1 }]}
          >
            <Feather name="key" size={11} color={colors.warning} />
            <Text style={[styles.providerText, { color: colors.warning, fontWeight: "700" }]}>
              Adicionar Chave
            </Text>
          </TouchableOpacity>
        )}
        {messages.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setMessages([]);
              setShowQuickReplies(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }}
            style={[styles.resetBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Modo de chat */}
      <View style={[styles.modeBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {CHAT_MODES.map((m) => {
          const active = chatMode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => {
                setChatMode(m.key);
                setMessages([]);
                setShowQuickReplies(false);
                Haptics.selectionAsync();
              }}
              style={[
                styles.modeBtn,
                { backgroundColor: active ? m.color + "22" : "transparent", borderColor: active ? m.color : "transparent" },
              ]}
            >
              <Feather name={m.icon as any} size={12} color={active ? m.color : colors.mutedForeground} />
              <Text style={{ fontSize: 11, fontWeight: active ? "700" : "400", color: active ? m.color : colors.mutedForeground, marginLeft: 4 }}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Painel rÃÂ¡pido de chave */}
      {showQuickKey && !provider && (
        <View style={[styles.quickKeyPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* Cortesia Gemini Ã¢ÂÂ sem chave */}
          <TouchableOpacity
            onPress={() => {
              addAIProvider({
                name: "Cortesia Gemini",
                type: "cortesia",
                apiKey: "",
                isActive: true,
              });
              setShowQuickKey(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            style={[styles.cortesiaBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
          >
            <Text style={{ fontSize: 18 }}>Ã¢ÂÂ¨</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>Usar Cortesia Gemini</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>GrÃÂ¡tis ÃÂ· sem chave ÃÂ· powered by Gemini 2.0 Flash</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>ou use sua prÃÂ³pria chave</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>
          <Text style={[styles.quickKeyTitle, { color: colors.foreground }]}>
            Cole sua API key Ã¢ÂÂ detecÃÂ§ÃÂ£o automÃÂ¡tica
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 6 }}>
            gsk_ ÃÂ· sk-or- ÃÂ· pplx- ÃÂ· AIza ÃÂ· xai- ÃÂ· sk-ant ÃÂ· sk-
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              style={[styles.quickKeyInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.primary }]}
              value={quickKey}
              onChangeText={setQuickKey}
              placeholder="Cole qualquer API key aqui..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <TouchableOpacity
              onPress={async () => {
                try {
                  const text = await Clipboard.getStringAsync();
                  if (text) setQuickKey(text.trim());
                } catch {}
              }}
              style={[styles.quickKeyBtn, { backgroundColor: colors.secondary }]}
            >
              <Feather name="clipboard" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {quickKey.length > 10 && (() => {
            const det = autoDetect(quickKey);
            return (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Feather name="check-circle" size={12} color={colors.success} />
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  <Text style={{ color: colors.success, fontWeight: "700" }}>
                    {det?.name || "OpenAI"}
                  </Text>
                  {det ? ` ÃÂ· ${det.model}` : ""}
                </Text>
              </View>
            );
          })()}
          <TouchableOpacity
            onPress={handleSaveQuickKey}
            disabled={!quickKey.trim()}
            style={[styles.quickKeySave, { backgroundColor: quickKey.trim() ? colors.primary : colors.muted }]}
          >
            <Feather name="check" size={15} color={colors.primaryForeground} />
            <Text style={[{ color: colors.primaryForeground, fontWeight: "700", fontSize: 15 }]}>Salvar e Usar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Feather name="cpu" size={36} color={colors.primary} />
            <Text style={[styles.emptyChatText, { color: colors.foreground }]}>
              IA Assistente
            </Text>
            <Text style={[{ color: colors.mutedForeground, fontSize: 12, textAlign: "center", marginBottom: 16 }]}>
              {activeFile
                ? `Contexto ativo: ${activeFile.name}`
                : "Toque em uma sugestÃÂ£o ou escreva sua pergunta"}
            </Text>
            {/* Chips de sugestÃÂ£o */}
            <View style={styles.suggestionGrid}>
              {SUGGESTION_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip.label}
                  onPress={() => sendMessage(chip.msg)}
                  style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.suggestionChipText, { color: colors.foreground }]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
      />

      {/* Chips de resposta rÃÂ¡pida (aparecem apÃÂ³s a IA responder) */}
      {showQuickReplies && !isLoading && messages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickReplyRow}
          style={[styles.quickReplyBar, { borderTopColor: colors.border }]}
        >
          {QUICK_REPLIES.map((r) => (
            <TouchableOpacity
              key={r.label}
              onPress={() => sendQuickReply(r.msg)}
              style={[styles.quickReplyChip, { backgroundColor: colors.card, borderColor: colors.primary + "66" }]}
            >
              <Text style={[styles.quickReplyText, { color: colors.primary }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Atalhos de geraÃÂ§ÃÂ£o (modo Dev + projeto ativo) */}
      {chatMode === "dev" && activeProject && !isLoading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 6, gap: 6 }}
          style={[{ borderTopWidth: 1, borderTopColor: colors.border }]}
        >
          {[
            { label: "Ã°ÂÂÂ Gerar PLANO.md", msg: `Analise o projeto "${activeProject.name}" (arquivos: ${activeProject.files.map(f => f.name).join(", ") || "nenhum"}) e gere um PLANO.md completo com: objetivo, stack tecnolÃÂ³gico, estrutura de pastas, funcionalidades implementadas, prÃÂ³ximos passos e arquitetura. Use markdown.` },
            { label: "Ã¢ÂÂÃ¯Â¸Â Gerar SISTEMA.md", msg: `Documente o projeto "${activeProject.name}" em um SISTEMA.md tÃÂ©cnico com: descriÃÂ§ÃÂ£o do sistema, variÃÂ¡veis de ambiente, endpoints da API (se houver), dependÃÂªncias, instruÃÂ§ÃÂµes de build/run, e notas de arquitetura. Use markdown.` },
            { label: "Ã°ÂÂÂ Revisar cÃÂ³digo", msg: `Revise todos os arquivos do projeto "${activeProject.name}" e liste: bugs encontrados, melhorias de performance, boas prÃÂ¡ticas nÃÂ£o seguidas, e sugestÃÂµes de refatoraÃÂ§ÃÂ£o. Seja objetivo e direto.` },
            { label: "Ã°ÂÂÂ¦ Listar deps", msg: `Quais bibliotecas/pacotes devo instalar para o projeto "${activeProject.name}"? Liste com: nome do pacote, versÃÂ£o recomendada, motivo de usar, e o comando npm install.` },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => sendMessage(item.msg)}
              style={[styles.quickReplyChip, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}
            >
              <Text style={[styles.quickReplyText, { color: colors.primary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Barra de input */}
      <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {/* BotÃÂ£o Colar */}
        <TouchableOpacity
          onPress={async () => {
            try {
              const text = await Clipboard.getStringAsync();
              if (text) {
                setInput((prev) => prev + text);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            } catch {}
          }}
          style={[styles.pasteBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="clipboard" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.chatInput,
            { color: colors.foreground, backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
          value={input}
          onChangeText={(t) => { setInput(t); if (showQuickReplies) setShowQuickReplies(false); }}
          placeholder="Pergunte, peÃÂ§a ajuda, diga OK..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Stop quando gerando / Send quando parado */}
        {isLoading ? (
          <TouchableOpacity
            onPress={stopGeneration}
            style={[styles.sendButton, { backgroundColor: "#ef4444" }]}
          >
            <Feather name="square" size={14} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim()}
            style={[
              styles.sendButton,
              { backgroundColor: input.trim() ? colors.primary : colors.secondary },
            ]}
          >
            <Feather name="send" size={16} color={input.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  providerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  providerText: { fontSize: 11 },
  noProvider: { fontSize: 11 },
  resetBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modeBar: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickKeyPanel: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  cortesiaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  quickKeyTitle: { fontSize: 13, fontWeight: "600" },
  quickKeyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  quickKeyBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickKeySave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  userBubble: { alignSelf: "flex-end", maxWidth: "85%", borderWidth: 0 },
  aiBubble: { alignSelf: "stretch" },
  aiLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  aiLabelText: { fontSize: 10, fontWeight: "700" },
  messageText: { fontSize: 14, lineHeight: 20 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 32, paddingHorizontal: 16, gap: 8 },
  emptyChatText: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  contextHint: { fontSize: 12, fontWeight: "600" },
  suggestionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, width: "100%" },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionChipText: { fontSize: 13, fontWeight: "500" },
  quickReplyBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: 50,
  },
  quickReplyRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  quickReplyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickReplyText: { fontSize: 13, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pasteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
