import { Router } from "express";
import { spawn } from "child_process";
import { mkdir, writeFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const router = Router();
const BASE_DIR = "/tmp/devmobile-sessions";

function sanitizeSession(id: string): string {
  return id.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 64) || "default";
}

async function ensureWorkspace(sessionId: string): Promise<string> {
  const dir = path.join(BASE_DIR, sanitizeSession(sessionId));
  await mkdir(dir, { recursive: true });
  return dir;
}

router.post("/terminal/exec", async (req, res) => {
  const { command, sessionId = "default" } = req.body as {
    command: string;
    sessionId?: string;
  };

  if (!command?.trim()) {
    res.status(400).json({ error: "command obrigatÃÂ³rio" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const cwd = await ensureWorkspace(sessionId);

  const child = spawn("sh", ["-c", command], {
    cwd,
    env: {
      ...process.env,
      HOME: cwd,
      PATH: (process.env.PATH || "/usr/bin:/bin") + ":/usr/local/bin",
      npm_config_prefix: cwd,
      NODE_PATH: path.join(cwd, "node_modules"),
    },
  });

  const send = (type: string, data: string) => {
    try {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    } catch {}
  };

  const killTimer = setTimeout(() => {
    send("stderr", "\nÃ¢ÂÂ± Tempo limite atingido (60s). Processo encerrado.\n");
    child.kill("SIGKILL");
  }, 60_000);

  child.stdout.on("data", (chunk: Buffer) => {
    send("stdout", chunk.toString());
  });

  child.stderr.on("data", (chunk: Buffer) => {
    send("stderr", chunk.toString());
  });

  child.on("close", (code) => {
    clearTimeout(killTimer);
    send("exit", String(code ?? 0));
    try {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch {}
  });

  child.on("error", (err) => {
    clearTimeout(killTimer);
    send("error", err.message);
    try {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch {}
  });

  req.on("close", () => {
    clearTimeout(killTimer);
    child.kill("SIGTERM");
  });
});

router.post("/terminal/write", async (req, res) => {
  const { sessionId = "default", files } = req.body as {
    sessionId?: string;
    files: Array<{ path: string; content: string }>;
  };

  if (!Array.isArray(files)) {
    res.status(400).json({ error: "files deve ser um array" });
    return;
  }

  const cwd = await ensureWorkspace(sessionId);

  for (const file of files) {
    const safe = file.path.replace(/\.\./g, "").replace(/^\/+/, "");
    const dest = path.join(cwd, safe);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, file.content ?? "", "utf8");
  }

  res.json({ ok: true, cwd, count: files.length });
});

router.get("/terminal/ls", async (req, res) => {
  const sessionId = (req.query.sessionId as string) || "default";
  const cwd = await ensureWorkspace(sessionId);

  try {
    const entries = await readdir(cwd);
    const details = await Promise.all(
      entries.map(async (name) => {
        const s = await stat(path.join(cwd, name)).catch(() => null);
        return { name, isDir: s?.isDirectory() ?? false, size: s?.size ?? 0 };
      })
    );
    res.json({ cwd, files: details });
  } catch {
    res.json({ cwd, files: [] });
  }
});

router.delete("/terminal/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const dir = path.join(BASE_DIR, sanitizeSession(sessionId));
  if (existsSync(dir)) {
    const { rm } = await import("fs/promises");
    await rm(dir, { recursive: true, force: true });
  }
  res.json({ ok: true });
});

export { router as terminalRouter };
