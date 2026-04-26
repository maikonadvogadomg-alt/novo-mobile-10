import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const SERVER_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = SERVER_DOMAIN ? `https://${SERVER_DOMAIN}/api` : "";

interface StatusItem {
  id: string;
  label: string;
  icon: string;
  status: "ok" | "warn" | "fail" | "checking";
  detail: string;
}

function StatusDot({ status }: { status: StatusItem["status"] }) {
  const color =
    status === "ok" ? "#00d4aa" : status === "warn" ? "#f59e0b" : status === "fail" ? "#ef4444" : "#888";
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: color,
        marginRight: 8,
      }}
    />
  );
}

export default function SystemStatus({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { aiProviders, dbConfigs, gitConfigs, activeProject, settings, terminalSessions } = useApp();
  const [items, setItems] = useState<StatusItem[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const runChecks = useCallback(async () => {
    setChecking(true);
    const results: StatusItem[] = [];

    results.push({
      id: "internet",
      label: "ConexÃÂ£o ÃÂ  internet",
      icon: "wifi",
      status: "checking",
      detail: "Verificando...",
    });
    setItems([...results]);

    try {
      const r = await fetch("https://1.1.1.1/cdn-cgi/trace", { cache: "no-store" }).catch(() => null);
      results[results.length - 1] = {
        id: "internet",
        label: "ConexÃÂ£o ÃÂ  internet",
        icon: "wifi",
        status: r ? "ok" : "fail",
        detail: r ? "Online" : "Offline Ã¢ÂÂ sem internet",
      };
    } catch {
      results[results.length - 1] = { ...results[results.length - 1], status: "fail", detail: "Offline" };
    }
    setItems([...results]);

    results.push({ id: "api", label: "Servidor da API", icon: "server", status: "checking", detail: "Verificando..." });
    setItems([...results]);
    if (API_BASE) {
      try {
        const r = await fetch(`${API_BASE}/healthz`, { cache: "no-store" }).catch(() => null);
        if (r?.ok) {
          results[results.length - 1] = { id: "api", label: "Servidor da API", icon: "server", status: "ok", detail: `OK ÃÂ· ${API_BASE}` };
        } else {
          results[results.length - 1] = { id: "api", label: "Servidor da API", icon: "server", status: "warn", detail: `Servidor respondeu HTTP ${r?.status}` };
        }
      } catch (e) {
        results[results.length - 1] = { id: "api", label: "Servidor da API", icon: "server", status: "fail", detail: "Erro ao conectar ao servidor" };
      }
    } else {
      results[results.length - 1] = { id: "api", label: "Servidor da API", icon: "server", status: "warn", detail: "EXPO_PUBLIC_DOMAIN nÃÂ£o configurado" };
    }
    setItems([...results]);

    results.push({ id: "ai", label: "IA (Cortesia Gemini)", icon: "cpu", status: "checking", detail: "Verificando..." });
    setItems([...results]);
    if (API_BASE) {
      try {
        const r = await fetch(`${API_BASE}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
          cache: "no-store",
        }).catch(() => null);
        results[results.length - 1] = {
          id: "ai", label: "IA (Cortesia Gemini)", icon: "cpu",
          status: r?.ok ? "ok" : "warn",
          detail: r?.ok ? "Respondendo normalmente" : `HTTP ${r?.status} Ã¢ÂÂ verifique o servidor`,
        };
      } catch {
        results[results.length - 1] = { id: "ai", label: "IA (Cortesia Gemini)", icon: "cpu", status: "fail", detail: "Endpoint /api/ai/chat nÃÂ£o acessÃÂ­vel" };
      }
    } else {
      results[results.length - 1] = { id: "ai", label: "IA (Cortesia Gemini)", icon: "cpu", status: "warn", detail: "DomÃÂ­nio do servidor nÃÂ£o configurado" };
    }
    setItems([...results]);

    const activeAI = aiProviders.find((p) => p.isActive);
    results.push({
      id: "ai_provider",
      label: "Provedor de IA ativo",
      icon: "zap",
      status: activeAI ? "ok" : "warn",
      detail: activeAI ? `${activeAI.name} ÃÂ· ${activeAI.model || "modelo padrÃÂ£o"}` : "Nenhum provedor configurado Ã¢ÂÂ use Cortesia Gemini",
    });
    setItems([...results]);

    results.push({
      id: "terminal",
      label: "Terminal",
      icon: "terminal",
      status: "ok",
      detail: `${terminalSessions.length} sessÃÂ£o(ÃÂµes) ÃÂ· Node.js Real disponÃÂ­vel via botÃÂ£o [NODE]`,
    });
    setItems([...results]);

    results.push({
      id: "db",
      label: "Banco de Dados",
      icon: "database",
      status: dbConfigs.length > 0 ? "ok" : "warn",
      detail: dbConfigs.length > 0
        ? `${dbConfigs.length} banco(s) configurado(s): ${dbConfigs.map((d) => d.name).join(", ")}`
        : "Nenhum banco configurado Ã¢ÂÂ adicione em ConfiguraÃÂ§ÃÂµes",
    });
    setItems([...results]);

    results.push({
      id: "git",
      label: "GitHub / GitLab",
      icon: "git-branch",
      status: gitConfigs.length > 0 ? "ok" : "warn",
      detail: gitConfigs.length > 0
        ? `Conectado: ${gitConfigs.map((g) => `${g.provider} (${g.username})`).join(", ")}`
        : "Nenhuma conta Git configurada",
    });
    setItems([...results]);

    results.push({
      id: "project",
      label: "Projeto atual",
      icon: "folder",
      status: activeProject ? "ok" : "warn",
      detail: activeProject
        ? `${activeProject.name} ÃÂ· ${activeProject.files.length} arquivo(s)`
        : "Nenhum projeto aberto",
    });
    setItems([...results]);

    results.push({
      id: "pwa",
      label: "Modo PWA",
      icon: "smartphone",
      status: "ok",
      detail: Platform.OS === "web" ? "Rodando no browser / PWA" : `App nativo (${Platform.OS})`,
    });
    setItems([...results]);

    const mb = 10240;
    results.push({
      id: "storage",
      label: "Armazenamento local",
      icon: "hard-drive",
      status: "ok",
      detail: `Projetos: ${activeProject?.files.length || 0} arquivos ÃÂ· AsyncStorage ativo`,
    });
    setItems([...results]);

    setChecking(false);
    setLastUpdate(new Date());
  }, [aiProviders, dbConfigs, gitConfigs, activeProject, terminalSessions]);

  useEffect(() => {
    if (visible) runChecks();
  }, [visible]);

  const counts = {
    ok: items.filter((i) => i.status === "ok").length,
    warn: items.filter((i) => i.status === "warn").length,
    fail: items.filter((i) => i.status === "fail").length,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay]}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Ã°ÂÂ©Âº Status do Sistema ao Vivo</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {lastUpdate && (
            <View style={[styles.summaryBar, { backgroundColor: colors.card }]}>
              <Text style={[styles.summaryItem, { color: "#00d4aa" }]}>Ã¢ÂÂ {counts.ok} ok</Text>
              <Text style={[styles.summaryItem, { color: "#f59e0b" }]}>Ã¢ÂÂ Ã¯Â¸Â {counts.warn} atenÃÂ§ÃÂ£o</Text>
              <Text style={[styles.summaryItem, { color: "#ef4444" }]}>Ã¢ÂÂ {counts.fail} falha</Text>
              <Text style={[styles.summaryItem, { color: colors.mutedForeground, fontSize: 10 }]}>
                {lastUpdate.toLocaleTimeString("pt-BR")}
              </Text>
            </View>
          )}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            {items.map((item) => (
              <View key={item.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                <StatusDot status={item.status} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.rowDetail, { color: item.status === "fail" ? "#ef4444" : item.status === "warn" ? "#f59e0b" : colors.mutedForeground }]}>
                    {item.status === "checking" ? "Verificando..." : item.detail}
                  </Text>
                </View>
                {item.status === "checking" && <ActivityIndicator size="small" color={colors.primary} />}
                {item.status === "ok" && <Feather name="check-circle" size={16} color="#00d4aa" />}
                {item.status === "warn" && <Feather name="alert-circle" size={16} color="#f59e0b" />}
                {item.status === "fail" && <Feather name="x-circle" size={16} color="#ef4444" />}
              </View>
            ))}

            {items.length === 0 && checking && (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Verificando sistema...</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={runChecks}
              disabled={checking}
              style={[styles.refreshBtn, { backgroundColor: checking ? colors.muted : colors.primary }]}
            >
              {checking
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Feather name="refresh-cw" size={14} color="#fff" /><Text style={styles.refreshText}> Atualizar agora</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "85%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: "700" },
  summaryBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    alignItems: "center",
  },
  summaryItem: { fontSize: 12, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  rowDetail: { fontSize: 11 },
  footer: {
    padding: 12,
    borderTopWidth: 1,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  refreshText: { color: "#fff", fontWeight: "700", marginLeft: 6 },
});
