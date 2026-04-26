import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LibrarySearch from "@/components/LibrarySearch";
import ProjectPlanModal from "@/components/ProjectPlanModal";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportZip, importTar, importZip } from "@/utils/zipUtils";
import type { Project } from "@/context/AppContext";

const TEMPLATES: Record<string, { label: string; icon: string; files: { name: string; content: string }[] }> = {
  vazio: {
    label: "Vazio",
    icon: "box",
    files: [
      { name: "README.md", content: "# Novo Projeto\n\nDescreva seu projeto aqui.\n\n## InstalaÃÂ§ÃÂ£o\n```bash\nnpm install\n```\n\n## Uso\n```bash\nnpm start\n```\n" },
      { name: ".gitignore", content: "node_modules/\n.env\n.DS_Store\ndist/\nbuild/\n*.log\n" },
    ],
  },
  javascript: {
    label: "JavaScript",
    icon: "code",
    files: [
      { name: "index.js", content: `const fs = require('fs');
const path = require('path');

// ConfiguraÃÂ§ÃÂ£o
const config = {
  nome: 'Meu App',
  versao: '1.0.0',
  debug: process.env.NODE_ENV !== 'production',
};

// UtilitÃÂ¡rios
function formatarData(data = new Date()) {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Classe principal
class App {
  constructor(config) {
    this.config = config;
    this.dados = [];
    this.inicializado = false;
  }

  async inicializar() {
    console.log(\`[\${formatarData()}] Iniciando \${this.config.nome} v\${this.config.versao}\`);
    await sleep(100);
    this.inicializado = true;
    return this;
  }

  adicionar(item) {
    if (!this.inicializado) throw new Error('App nÃÂ£o inicializado');
    const registro = { id: Date.now(), ...item, criadoEm: new Date().toISOString() };
    this.dados.push(registro);
    return registro;
  }

  buscar(id) {
    return this.dados.find(d => d.id === id) || null;
  }

  listar(filtro = {}) {
    return this.dados.filter(d =>
      Object.entries(filtro).every(([k, v]) => d[k] === v)
    );
  }

  remover(id) {
    const idx = this.dados.findIndex(d => d.id === id);
    if (idx === -1) return false;
    this.dados.splice(idx, 1);
    return true;
  }

  status() {
    return {
      nome: this.config.nome,
      versao: this.config.versao,
      totalRegistros: this.dados.length,
      inicializado: this.inicializado,
      dataAtual: formatarData(),
    };
  }
}

// ExecuÃÂ§ÃÂ£o
async function main() {
  const app = await new App(config).inicializar();

  app.adicionar({ nome: 'Primeiro Item', tipo: 'exemplo' });
  app.adicionar({ nome: 'Segundo Item', tipo: 'exemplo' });
  app.adicionar({ nome: 'Item Especial', tipo: 'especial' });

  console.log('Todos:', app.listar());
  console.log('Exemplos:', app.listar({ tipo: 'exemplo' }));
  console.log('Status:', app.status());
}

main().catch(console.error);
` },
      { name: "package.json", content: '{\n  "name": "meu-projeto-js",\n  "version": "1.0.0",\n  "description": "Projeto JavaScript",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js",\n    "dev": "nodemon index.js",\n    "test": "node --test"\n  },\n  "dependencies": {},\n  "devDependencies": {\n    "nodemon": "^3.0.0"\n  }\n}\n' },
      { name: ".env", content: "NODE_ENV=development\nPORT=3000\n" },
      { name: ".gitignore", content: "node_modules/\n.env\n*.log\n" },
      { name: "README.md", content: "# Meu Projeto JavaScript\n\n## InstalaÃÂ§ÃÂ£o\n```bash\nnpm install\n```\n\n## Executar\n```bash\nnpm start\n# ou em modo desenvolvimento:\nnpm run dev\n```\n" },
    ],
  },
  typescript: {
    label: "TypeScript",
    icon: "file-text",
    files: [
      { name: "src/index.ts", content: `import path from 'path';

// Tipos
interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: 'admin' | 'usuario' | 'visitante';
  criadoEm: Date;
}

interface RespostaAPI<T> {
  sucesso: boolean;
  dados?: T;
  erro?: string;
  total?: number;
}

// RepositÃÂ³rio genÃÂ©rico
class Repositorio<T extends { id: number }> {
  private items: T[] = [];
  private nextId = 1;

  criar(data: Omit<T, 'id'>): T {
    const item = { ...data, id: this.nextId++ } as T;
    this.items.push(item);
    return item;
  }

  buscarPorId(id: number): T | undefined {
    return this.items.find(i => i.id === id);
  }

  listarTodos(filtro?: Partial<T>): T[] {
    if (!filtro) return [...this.items];
    return this.items.filter(item =>
      Object.entries(filtro).every(([k, v]) => (item as Record<string, unknown>)[k] === v)
    );
  }

  atualizar(id: number, data: Partial<T>): T | null {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this.items[idx] = { ...this.items[idx], ...data };
    return this.items[idx];
  }

  remover(id: number): boolean {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }
}

// ServiÃÂ§o de usuÃÂ¡rios
class ServicoUsuario {
  private repo = new Repositorio<Usuario>();

  criar(nome: string, email: string, papel: Usuario['papel'] = 'usuario'): RespostaAPI<Usuario> {
    if (!email.includes('@')) {
      return { sucesso: false, erro: 'Email invÃÂ¡lido' };
    }
    const usuario = this.repo.criar({ nome, email, papel, criadoEm: new Date() });
    return { sucesso: true, dados: usuario };
  }

  buscar(id: number): RespostaAPI<Usuario> {
    const usuario = this.repo.buscarPorId(id);
    if (!usuario) return { sucesso: false, erro: 'UsuÃÂ¡rio nÃÂ£o encontrado' };
    return { sucesso: true, dados: usuario };
  }

  listar(papel?: Usuario['papel']): RespostaAPI<Usuario[]> {
    const todos = papel ? this.repo.listarTodos({ papel } as Partial<Usuario>) : this.repo.listarTodos();
    return { sucesso: true, dados: todos, total: todos.length };
  }
}

// Main
async function main(): Promise<void> {
  const servico = new ServicoUsuario();

  console.log('=== Sistema de UsuÃÂ¡rios ===\\n');

  const r1 = servico.criar('JoÃÂ£o Silva', 'joao@email.com', 'admin');
  const r2 = servico.criar('Maria Souza', 'maria@email.com', 'usuario');
  const r3 = servico.criar('Carlos Lima', 'carlos@email.com', 'usuario');

  console.log('Criados:', [r1, r2, r3].map(r => r.dados?.nome));

  const lista = servico.listar();
  console.log('Total de usuÃÂ¡rios:', lista.total);
  console.log('UsuÃÂ¡rios:', lista.dados?.map(u => \`\${u.nome} (\${u.papel})\`));

  const buscado = servico.buscar(1);
  console.log('\\nUsuÃÂ¡rio ID 1:', buscado.dados);
}

main().catch(console.error);
` },
      { name: "tsconfig.json", content: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "commonjs",\n    "lib": ["ES2022"],\n    "strict": true,\n    "esModuleInterop": true,\n    "skipLibCheck": true,\n    "outDir": "./dist",\n    "rootDir": "./src",\n    "resolveJsonModule": true,\n    "declaration": true,\n    "sourceMap": true\n  },\n  "include": ["src/**/*"],\n  "exclude": ["node_modules", "dist"]\n}\n' },
      { name: "package.json", content: '{\n  "name": "meu-projeto-ts",\n  "version": "1.0.0",\n  "scripts": {\n    "build": "tsc",\n    "start": "node dist/index.js",\n    "dev": "ts-node src/index.ts",\n    "watch": "tsc --watch"\n  },\n  "dependencies": {},\n  "devDependencies": {\n    "typescript": "^5.3.0",\n    "ts-node": "^10.9.0",\n    "@types/node": "^20.0.0"\n  }\n}\n' },
      { name: ".gitignore", content: "node_modules/\ndist/\n.env\n*.log\n" },
    ],
  },
  python: {
    label: "Python",
    icon: "terminal",
    files: [
      { name: "main.py", content: `#!/usr/bin/env python3
"""API REST simples com Flask"""

from flask import Flask, jsonify, request, abort
from datetime import datetime
from typing import Optional
import os

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# "Banco" em memÃÂ³ria
usuarios = []
proximo_id = 1

def gerar_id():
    global proximo_id
    id_atual = proximo_id
    proximo_id += 1
    return id_atual

def validar_email(email: str) -> bool:
    return '@' in email and '.' in email.split('@')[-1]

# Rotas
@app.route('/api/saude', methods=['GET'])
def saude():
    return jsonify({
        'status': 'ok',
        'versao': '1.0.0',
        'horario': datetime.now().isoformat()
    })

@app.route('/api/usuarios', methods=['GET'])
def listar_usuarios():
    papel = request.args.get('papel')
    resultado = [u for u in usuarios if not papel or u['papel'] == papel]
    return jsonify({'sucesso': True, 'dados': resultado, 'total': len(resultado)})

@app.route('/api/usuarios/<int:uid>', methods=['GET'])
def buscar_usuario(uid: int):
    usuario = next((u for u in usuarios if u['id'] == uid), None)
    if not usuario:
        abort(404, description='UsuÃÂ¡rio nÃÂ£o encontrado')
    return jsonify({'sucesso': True, 'dados': usuario})

@app.route('/api/usuarios', methods=['POST'])
def criar_usuario():
    dados = request.get_json()
    if not dados or not dados.get('nome') or not dados.get('email'):
        abort(400, description='Nome e email sÃÂ£o obrigatÃÂ³rios')
    if not validar_email(dados['email']):
        abort(400, description='Email invÃÂ¡lido')
    usuario = {
        'id': gerar_id(),
        'nome': dados['nome'],
        'email': dados['email'],
        'papel': dados.get('papel', 'usuario'),
        'criado_em': datetime.now().isoformat(),
    }
    usuarios.append(usuario)
    return jsonify({'sucesso': True, 'dados': usuario}), 201

@app.route('/api/usuarios/<int:uid>', methods=['PUT'])
def atualizar_usuario(uid: int):
    usuario = next((u for u in usuarios if u['id'] == uid), None)
    if not usuario:
        abort(404, description='UsuÃÂ¡rio nÃÂ£o encontrado')
    dados = request.get_json() or {}
    usuario.update({k: v for k, v in dados.items() if k in ['nome', 'email', 'papel']})
    return jsonify({'sucesso': True, 'dados': usuario})

@app.route('/api/usuarios/<int:uid>', methods=['DELETE'])
def remover_usuario(uid: int):
    global usuarios
    tam = len(usuarios)
    usuarios = [u for u in usuarios if u['id'] != uid]
    if len(usuarios) == tam:
        abort(404, description='UsuÃÂ¡rio nÃÂ£o encontrado')
    return jsonify({'sucesso': True, 'mensagem': 'UsuÃÂ¡rio removido'})

@app.errorhandler(404)
def nao_encontrado(e):
    return jsonify({'sucesso': False, 'erro': str(e)}), 404

@app.errorhandler(400)
def requisicao_invalida(e):
    return jsonify({'sucesso': False, 'erro': str(e)}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    print(f'Servidor rodando em http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug)
` },
      { name: "requirements.txt", content: "flask==3.0.0\npython-dotenv==1.0.0\ngunicorn==21.2.0\n" },
      { name: ".env", content: "FLASK_ENV=development\nPORT=5000\nSECRET_KEY=troque-esta-chave\n" },
      { name: ".gitignore", content: "__pycache__/\n*.pyc\n*.pyo\n.env\nvenv/\n.venv/\n*.egg-info/\ndist/\nbuild/\n" },
      { name: "README.md", content: "# API Python Flask\n\n## InstalaÃÂ§ÃÂ£o\n```bash\npython -m venv venv\nsource venv/bin/activate  # Linux/Mac\nvenv\\Scripts\\activate     # Windows\npip install -r requirements.txt\n```\n\n## Executar\n```bash\npython main.py\n```\n\n## Endpoints\n- `GET /api/saude` Ã¢ÂÂ Status da API\n- `GET /api/usuarios` Ã¢ÂÂ Listar usuÃÂ¡rios\n- `POST /api/usuarios` Ã¢ÂÂ Criar usuÃÂ¡rio\n- `GET /api/usuarios/:id` Ã¢ÂÂ Buscar por ID\n- `PUT /api/usuarios/:id` Ã¢ÂÂ Atualizar\n- `DELETE /api/usuarios/:id` Ã¢ÂÂ Remover\n" },
    ],
  },
  html: {
    label: "HTML/CSS/JS",
    icon: "globe",
    files: [
      { name: "index.html", content: `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Site</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="header">
    <nav class="nav">
      <div class="logo">MeuSite</div>
      <ul class="nav-links">
        <li><a href="#inicio">InÃÂ­cio</a></li>
        <li><a href="#sobre">Sobre</a></li>
        <li><a href="#contato">Contato</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <section id="inicio" class="hero">
      <h1>Bem-vindo ao <span class="destaque">MeuSite</span></h1>
      <p>Uma soluÃÂ§ÃÂ£o moderna e responsiva para seu negÃÂ³cio.</p>
      <button class="btn-primary" onclick="scrollParaContato()">Fale Conosco</button>
    </section>

    <section id="sobre" class="sobre">
      <h2>Sobre NÃÂ³s</h2>
      <div class="cards">
        <div class="card">
          <div class="card-icon">Ã°ÂÂÂ</div>
          <h3>RÃÂ¡pido</h3>
          <p>Performance otimizada para melhor experiÃÂªncia.</p>
        </div>
        <div class="card">
          <div class="card-icon">Ã°ÂÂÂ</div>
          <h3>Seguro</h3>
          <p>Dados protegidos com as melhores prÃÂ¡ticas.</p>
        </div>
        <div class="card">
          <div class="card-icon">Ã°ÂÂÂ±</div>
          <h3>Responsivo</h3>
          <p>Funciona em qualquer dispositivo.</p>
        </div>
      </div>
    </section>

    <section id="contato" class="contato">
      <h2>Entre em Contato</h2>
      <form id="form-contato" onsubmit="enviarForm(event)">
        <div class="form-group">
          <label for="nome">Nome</label>
          <input type="text" id="nome" placeholder="Seu nome" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="seu@email.com" required>
        </div>
        <div class="form-group">
          <label for="mensagem">Mensagem</label>
          <textarea id="mensagem" rows="4" placeholder="Sua mensagem..." required></textarea>
        </div>
        <button type="submit" class="btn-primary">Enviar</button>
      </form>
      <div id="feedback" class="feedback hidden"></div>
    </section>
  </main>

  <footer class="footer">
    <p>&copy; 2024 MeuSite. Todos os direitos reservados.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>
` },
      { name: "style.css", content: `* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --text: #1f2937;
  --text-muted: #6b7280;
  --bg: #ffffff;
  --bg-alt: #f9fafb;
  --border: #e5e7eb;
  --radius: 12px;
}

body { font-family: 'Segoe UI', sans-serif; color: var(--text); line-height: 1.6; }

.header { position: fixed; top: 0; width: 100%; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border); z-index: 100; }
.nav { max-width: 1100px; margin: 0 auto; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
.logo { font-size: 1.3rem; font-weight: 700; color: var(--primary); }
.nav-links { list-style: none; display: flex; gap: 2rem; }
.nav-links a { text-decoration: none; color: var(--text-muted); font-weight: 500; transition: color 0.2s; }
.nav-links a:hover { color: var(--primary); }

.hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 6rem 2rem 2rem; background: linear-gradient(135deg, #f0f0ff 0%, #fff 60%); }
.hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; margin-bottom: 1rem; }
.destaque { color: var(--primary); }
.hero p { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 2rem; max-width: 500px; }

.btn-primary { background: var(--primary); color: #fff; border: none; padding: 0.9rem 2.2rem; border-radius: var(--radius); font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.1s; }
.btn-primary:hover { background: var(--primary-dark); transform: translateY(-2px); }

.sobre { padding: 5rem 2rem; background: var(--bg-alt); }
.sobre h2, .contato h2 { text-align: center; font-size: 2rem; margin-bottom: 3rem; }
.cards { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
.card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; text-align: center; transition: transform 0.2s, box-shadow 0.2s; }
.card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
.card-icon { font-size: 2.5rem; margin-bottom: 1rem; }
.card h3 { font-size: 1.2rem; margin-bottom: 0.5rem; }
.card p { color: var(--text-muted); font-size: 0.95rem; }

.contato { padding: 5rem 2rem; }
form { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.2rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
label { font-weight: 600; font-size: 0.9rem; }
input, textarea { border: 1px solid var(--border); border-radius: 8px; padding: 0.8rem 1rem; font-size: 1rem; font-family: inherit; transition: border-color 0.2s; }
input:focus, textarea:focus { outline: none; border-color: var(--primary); }
textarea { resize: vertical; }

.feedback { max-width: 560px; margin: 1rem auto 0; padding: 1rem; border-radius: var(--radius); text-align: center; font-weight: 600; }
.feedback.sucesso { background: #d1fae5; color: #065f46; }
.feedback.erro { background: #fee2e2; color: #991b1b; }
.hidden { display: none; }

.footer { background: var(--text); color: #9ca3af; text-align: center; padding: 1.5rem; font-size: 0.9rem; }

@media (max-width: 640px) { .nav-links { display: none; } }
` },
      { name: "script.js", content: `// Smooth scroll para seÃÂ§ÃÂµes
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(link.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  });
});

function scrollParaContato() {
  document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
}

// FormulÃÂ¡rio de contato
function enviarForm(e) {
  e.preventDefault();
  const feedback = document.getElementById('feedback');
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const mensagem = document.getElementById('mensagem').value;

  if (!nome || !email || !mensagem) {
    mostrarFeedback('Por favor, preencha todos os campos.', false);
    return;
  }

  // Simula envio
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  setTimeout(() => {
    mostrarFeedback(\`Mensagem enviada com sucesso, \${nome}! Entraremos em contato em breve.\`, true);
    e.target.reset();
    btn.textContent = 'Enviar';
    btn.disabled = false;
  }, 1500);
}

function mostrarFeedback(msg, sucesso) {
  const el = document.getElementById('feedback');
  el.textContent = msg;
  el.className = \`feedback \${sucesso ? 'sucesso' : 'erro'}\`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => { el.className = 'feedback hidden'; }, 5000);
}

// AnimaÃÂ§ÃÂ£o de entrada ao rolar
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.style.opacity = '1';
  });
}, { threshold: 0.1 });

document.querySelectorAll('.card').forEach(el => {
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.5s ease';
  observer.observe(el);
});
` },
    ],
  },
  api_express: {
    label: "API Express",
    icon: "server",
    files: [
      { name: "server.js", content: `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requisiÃÂ§ÃÂµes
app.use((req, res, next) => {
  console.log(\`[\${new Date().toLocaleTimeString('pt-BR')}] \${req.method} \${req.url}\`);
  next();
});

// Banco em memÃÂ³ria
const db = {
  usuarios: [],
  nextId: 1,
};

// Helpers
function criarId() { return db.nextId++; }
function agora() { return new Date().toISOString(); }
function validar(obj, campos) {
  const faltando = campos.filter(c => !obj[c]);
  return faltando.length ? \`Campos obrigatÃÂ³rios: \${faltando.join(', ')}\` : null;
}

// === ROTAS ===

// SaÃÂºde
app.get('/api/saude', (req, res) => {
  res.json({ status: 'ok', versao: '1.0.0', timestamp: agora(), usuarios: db.usuarios.length });
});

// Listar usuÃÂ¡rios
app.get('/api/usuarios', (req, res) => {
  const { papel, busca } = req.query;
  let lista = [...db.usuarios];
  if (papel) lista = lista.filter(u => u.papel === papel);
  if (busca) lista = lista.filter(u =>
    u.nome.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase())
  );
  res.json({ sucesso: true, dados: lista, total: lista.length });
});

// Buscar por ID
app.get('/api/usuarios/:id', (req, res) => {
  const usuario = db.usuarios.find(u => u.id === +req.params.id);
  if (!usuario) return res.status(404).json({ sucesso: false, erro: 'UsuÃÂ¡rio nÃÂ£o encontrado' });
  res.json({ sucesso: true, dados: usuario });
});

// Criar usuÃÂ¡rio
app.post('/api/usuarios', (req, res) => {
  const erro = validar(req.body, ['nome', 'email']);
  if (erro) return res.status(400).json({ sucesso: false, erro });
  if (!req.body.email.includes('@')) return res.status(400).json({ sucesso: false, erro: 'Email invÃÂ¡lido' });
  const usuario = {
    id: criarId(),
    nome: req.body.nome,
    email: req.body.email.toLowerCase(),
    papel: req.body.papel || 'usuario',
    ativo: true,
    criadoEm: agora(),
    atualizadoEm: agora(),
  };
  db.usuarios.push(usuario);
  res.status(201).json({ sucesso: true, dados: usuario });
});

// Atualizar
app.put('/api/usuarios/:id', (req, res) => {
  const idx = db.usuarios.findIndex(u => u.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ sucesso: false, erro: 'UsuÃÂ¡rio nÃÂ£o encontrado' });
  const campos = ['nome', 'email', 'papel', 'ativo'];
  campos.forEach(c => { if (req.body[c] !== undefined) db.usuarios[idx][c] = req.body[c]; });
  db.usuarios[idx].atualizadoEm = agora();
  res.json({ sucesso: true, dados: db.usuarios[idx] });
});

// Remover
app.delete('/api/usuarios/:id', (req, res) => {
  const idx = db.usuarios.findIndex(u => u.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ sucesso: false, erro: 'UsuÃÂ¡rio nÃÂ£o encontrado' });
  const removido = db.usuarios.splice(idx, 1)[0];
  res.json({ sucesso: true, mensagem: 'UsuÃÂ¡rio removido', dados: removido });
});

// 404
app.use((req, res) => {
  res.status(404).json({ sucesso: false, erro: \`Rota \${req.method} \${req.url} nÃÂ£o encontrada\` });
});

// Iniciar
app.listen(PORT, () => {
  console.log(\`Ã°ÂÂÂ API rodando em http://localhost:\${PORT}\`);
  console.log(\`Ã°ÂÂÂ Endpoints disponÃÂ­veis:\`);
  console.log(\`   GET    /api/saude\`);
  console.log(\`   GET    /api/usuarios\`);
  console.log(\`   GET    /api/usuarios/:id\`);
  console.log(\`   POST   /api/usuarios\`);
  console.log(\`   PUT    /api/usuarios/:id\`);
  console.log(\`   DELETE /api/usuarios/:id\`);
});
` },
      { name: "package.json", content: '{\n  "name": "api-express",\n  "version": "1.0.0",\n  "description": "API REST com Node.js e Express",\n  "main": "server.js",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "nodemon server.js"\n  },\n  "dependencies": {\n    "cors": "^2.8.5",\n    "dotenv": "^16.0.0",\n    "express": "^4.18.0"\n  },\n  "devDependencies": {\n    "nodemon": "^3.0.0"\n  }\n}\n' },
      { name: ".env", content: "PORT=3000\nNODE_ENV=development\nJWT_SECRET=troque-esta-chave-secreta\n" },
      { name: ".gitignore", content: "node_modules/\n.env\n*.log\n" },
    ],
  },
  neon: {
    label: "Neon DB",
    icon: "database",
    files: [
      { name: "index.js", content: `const express = require('express');
const { neon } = require('@neondatabase/serverless');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ConexÃÂ£o com Neon
const sql = neon(process.env.DATABASE_URL);

app.use(cors());
app.use(express.json());

// Inicializar tabelas
async function inicializarBanco() {
  await sql\`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(200) NOT NULL,
      email VARCHAR(200) UNIQUE NOT NULL,
      papel VARCHAR(50) DEFAULT 'usuario',
      ativo BOOLEAN DEFAULT TRUE,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )
  \`;
  await sql\`
    CREATE TABLE IF NOT EXISTS registros (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
      titulo VARCHAR(300) NOT NULL,
      conteudo TEXT,
      criado_em TIMESTAMP DEFAULT NOW()
    )
  \`;
  console.log('Ã¢ÂÂ Banco inicializado com sucesso');
}

// === ROTAS ===

app.get('/api/saude', async (req, res) => {
  try {
    const r = await sql\`SELECT NOW() as agora, version() as versao_pg\`;
    res.json({ status: 'ok', banco: 'Neon PostgreSQL', ...r[0] });
  } catch (e) {
    res.status(500).json({ status: 'erro', detalhe: e.message });
  }
});

// Listar usuÃÂ¡rios
app.get('/api/usuarios', async (req, res) => {
  try {
    const { papel, busca, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;
    let usuarios;
    if (busca) {
      usuarios = await sql\`
        SELECT * FROM usuarios
        WHERE (nome ILIKE ${'$'}{('%' + busca + '%')} OR email ILIKE ${'$'}{('%' + busca + '%')})
        AND (${'$'}{papel} IS NULL OR papel = ${'$'}{papel})
        ORDER BY criado_em DESC LIMIT ${'$'}{limite} OFFSET ${'$'}{offset}
      \`;
    } else {
      usuarios = await sql\`
        SELECT * FROM usuarios
        WHERE (${'$'}{papel || null} IS NULL OR papel = ${'$'}{papel || null})
        ORDER BY criado_em DESC LIMIT ${'$'}{limite} OFFSET ${'$'}{offset}
      \`;
    }
    const [{ total }] = await sql\`SELECT COUNT(*) as total FROM usuarios\`;
    res.json({ sucesso: true, dados: usuarios, total: +total, pagina: +pagina });
  } catch (e) {
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});

// Buscar por ID
app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const [usuario] = await sql\`SELECT * FROM usuarios WHERE id = ${'$'}{req.params.id}\`;
    if (!usuario) return res.status(404).json({ sucesso: false, erro: 'UsuÃÂ¡rio nÃÂ£o encontrado' });
    const registros = await sql\`SELECT * FROM registros WHERE usuario_id = ${'$'}{req.params.id} ORDER BY criado_em DESC\`;
    res.json({ sucesso: true, dados: { ...usuario, registros } });
  } catch (e) {
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});

// Criar usuÃÂ¡rio
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nome, email, papel = 'usuario' } = req.body;
    if (!nome || !email) return res.status(400).json({ sucesso: false, erro: 'Nome e email obrigatÃÂ³rios' });
    const [usuario] = await sql\`
      INSERT INTO usuarios (nome, email, papel)
      VALUES (${'$'}{nome}, ${'$'}{email.toLowerCase()}, ${'$'}{papel})
      RETURNING *
    \`;
    res.status(201).json({ sucesso: true, dados: usuario });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ sucesso: false, erro: 'Email jÃÂ¡ cadastrado' });
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});

// Atualizar
app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { nome, email, papel, ativo } = req.body;
    const [usuario] = await sql\`
      UPDATE usuarios SET
        nome = COALESCE(${'$'}{nome}, nome),
        email = COALESCE(${'$'}{email}, email),
        papel = COALESCE(${'$'}{papel}, papel),
        ativo = COALESCE(${'$'}{ativo}, ativo),
        atualizado_em = NOW()
      WHERE id = ${'$'}{req.params.id}
      RETURNING *
    \`;
    if (!usuario) return res.status(404).json({ sucesso: false, erro: 'UsuÃÂ¡rio nÃÂ£o encontrado' });
    res.json({ sucesso: true, dados: usuario });
  } catch (e) {
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});

// Remover
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const [removido] = await sql\`DELETE FROM usuarios WHERE id = ${'$'}{req.params.id} RETURNING *\`;
    if (!removido) return res.status(404).json({ sucesso: false, erro: 'UsuÃÂ¡rio nÃÂ£o encontrado' });
    res.json({ sucesso: true, mensagem: 'Removido com sucesso', dados: removido });
  } catch (e) {
    res.status(500).json({ sucesso: false, erro: e.message });
  }
});

// Iniciar
inicializarBanco().then(() => {
  app.listen(PORT, () => {
    console.log(\`Ã°ÂÂÂ API + Neon DB rodando em http://localhost:\${PORT}\`);
  });
}).catch(e => {
  console.error('Ã¢ÂÂ Erro ao conectar ao banco:', e.message);
  console.error('Verifique a variÃÂ¡vel DATABASE_URL no .env');
});
` },
      { name: "package.json", content: '{\n  "name": "api-neon-db",\n  "version": "1.0.0",\n  "description": "API REST com Node.js, Express e Neon PostgreSQL",\n  "main": "index.js",\n  "scripts": {\n    "start": "node index.js",\n    "dev": "nodemon index.js"\n  },\n  "dependencies": {\n    "@neondatabase/serverless": "^0.9.0",\n    "cors": "^2.8.5",\n    "dotenv": "^16.0.0",\n    "express": "^4.18.0"\n  },\n  "devDependencies": {\n    "nodemon": "^3.0.0"\n  }\n}\n' },
      { name: ".env", content: "# Cole sua connection string do Neon aqui:\n# Acesse: console.neon.tech Ã¢ÂÂ seu projeto Ã¢ÂÂ Connection string\nDATABASE_URL=postgresql://usuario:senha@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require\n\nPORT=3000\nNODE_ENV=development\n" },
      { name: ".gitignore", content: "node_modules/\n.env\n*.log\n" },
      { name: "README.md", content: "# API com Neon DB (PostgreSQL)\n\n## ConfiguraÃÂ§ÃÂ£o do Neon\n\n1. Acesse [console.neon.tech](https://console.neon.tech)\n2. Crie um projeto\n3. Copie a **Connection string**\n4. Cole no arquivo `.env` em `DATABASE_URL=...`\n\n## InstalaÃÂ§ÃÂ£o\n```bash\nnpm install\n```\n\n## Executar\n```bash\nnpm run dev\n```\n\n## Endpoints\n| MÃÂ©todo | Rota | DescriÃÂ§ÃÂ£o |\n|--------|------|-----------|\n| GET | /api/saude | Status + versÃÂ£o do banco |\n| GET | /api/usuarios | Listar (suporte a busca e paginaÃÂ§ÃÂ£o) |\n| GET | /api/usuarios/:id | Buscar com registros |\n| POST | /api/usuarios | Criar usuÃÂ¡rio |\n| PUT | /api/usuarios/:id | Atualizar |\n| DELETE | /api/usuarios/:id | Remover |\n\n## Testar\n```bash\n# Criar usuÃÂ¡rio\ncurl -X POST http://localhost:3000/api/usuarios \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"nome\":\"JoÃÂ£o\",\"email\":\"joao@email.com\"}'\n\n# Listar\ncurl http://localhost:3000/api/usuarios\n```\n" },
    ],
  },
  react: {
    label: "React + Vite",
    icon: "zap",
    files: [
      { name: "index.html", content: '<!DOCTYPE html>\n<html lang="pt-br">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n' },
      { name: "src/main.jsx", content: "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode><App /></React.StrictMode>\n);\n" },
      { name: "src/App.jsx", content: `import React, { useState, useEffect, useCallback } from 'react';

// Hook customizado para dados
function useLocalStorage(chave, valorInicial) {
  const [valor, setValor] = useState(() => {
    try { return JSON.parse(localStorage.getItem(chave)) ?? valorInicial; }
    catch { return valorInicial; }
  });
  const salvar = useCallback(novoValor => {
    setValor(novoValor);
    localStorage.setItem(chave, JSON.stringify(novoValor));
  }, [chave]);
  return [valor, salvar];
}

// Componente de tarefa
function CartaoTarefa({ tarefa, onConcluir, onRemover }) {
  return (
    <div className={\`card \${tarefa.concluida ? 'concluida' : ''}\`}>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={tarefa.concluida}
          onChange={() => onConcluir(tarefa.id)}
        />
        <span className="texto">{tarefa.texto}</span>
      </label>
      <div className="card-footer">
        <span className="data">{new Date(tarefa.criadaEm).toLocaleDateString('pt-BR')}</span>
        <button onClick={() => onRemover(tarefa.id)} className="btn-remover">Ã¢ÂÂ</button>
      </div>
    </div>
  );
}

// App principal
export default function App() {
  const [tarefas, setTarefas] = useLocalStorage('tarefas', []);
  const [input, setInput] = useState('');
  const [filtro, setFiltro] = useState('todas');

  const adicionar = () => {
    if (!input.trim()) return;
    setTarefas([...tarefas, {
      id: Date.now(),
      texto: input.trim(),
      concluida: false,
      criadaEm: new Date().toISOString(),
    }]);
    setInput('');
  };

  const concluir = id => setTarefas(tarefas.map(t => t.id === id ? { ...t, concluida: !t.concluida } : t));
  const remover = id => setTarefas(tarefas.filter(t => t.id !== id));
  const limparConcluidas = () => setTarefas(tarefas.filter(t => !t.concluida));

  const tarefasFiltradas = tarefas.filter(t =>
    filtro === 'todas' ? true : filtro === 'ativas' ? !t.concluida : t.concluida
  );
  const pendentes = tarefas.filter(t => !t.concluida).length;

  return (
    <div className="app">
      <header>
        <h1>Ã°ÂÂÂ Minhas Tarefas</h1>
        <p>{pendentes} pendente{pendentes !== 1 ? 's' : ''} de {tarefas.length}</p>
      </header>

      <div className="input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && adicionar()}
          placeholder="Nova tarefa..."
          autoFocus
        />
        <button onClick={adicionar} disabled={!input.trim()}>Adicionar</button>
      </div>

      <div className="filtros">
        {['todas', 'ativas', 'concluÃÂ­das'].map(f => (
          <button key={f} onClick={() => setFiltro(f === 'concluÃÂ­das' ? 'concluidas' : f)}
            className={filtro === (f === 'concluÃÂ­das' ? 'concluidas' : f) ? 'ativo' : ''}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="lista">
        {tarefasFiltradas.length === 0
          ? <p className="vazio">Nenhuma tarefa aqui.</p>
          : tarefasFiltradas.map(t => (
              <CartaoTarefa key={t.id} tarefa={t} onConcluir={concluir} onRemover={remover} />
            ))
        }
      </div>

      {tarefas.some(t => t.concluida) && (
        <button onClick={limparConcluidas} className="btn-limpar">
          Limpar concluÃÂ­das ({tarefas.filter(t => t.concluida).length})
        </button>
      )}
    </div>
  );
}
` },
      { name: "src/index.css", content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; background: #f3f4f6; color: #1f2937; min-height: 100vh; }
.app { max-width: 600px; margin: 0 auto; padding: 2rem 1rem; }
header { text-align: center; margin-bottom: 2rem; }
header h1 { font-size: 2rem; margin-bottom: 0.3rem; }
header p { color: #6b7280; }
.input-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.input-row input { flex: 1; padding: 0.8rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem; transition: border-color 0.2s; }
.input-row input:focus { outline: none; border-color: #6366f1; }
.input-row button { padding: 0.8rem 1.5rem; background: #6366f1; color: #fff; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.input-row button:hover:not(:disabled) { background: #4f46e5; }
.input-row button:disabled { opacity: 0.5; cursor: not-allowed; }
.filtros { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.filtros button { flex: 1; padding: 0.5rem; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
.filtros button.ativo { background: #6366f1; color: #fff; border-color: #6366f1; }
.lista { display: flex; flex-direction: column; gap: 0.7rem; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; transition: all 0.2s; }
.card.concluida { opacity: 0.6; }
.checkbox-label { display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; }
.checkbox-label input[type="checkbox"] { width: 18px; height: 18px; margin-top: 2px; accent-color: #6366f1; flex-shrink: 0; }
.texto { font-size: 1rem; line-height: 1.4; }
.concluida .texto { text-decoration: line-through; color: #9ca3af; }
.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #f3f4f6; }
.data { font-size: 0.8rem; color: #9ca3af; }
.btn-remover { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1rem; padding: 2px 6px; border-radius: 4px; }
.btn-remover:hover { background: #fee2e2; }
.vazio { text-align: center; color: #9ca3af; padding: 2rem; }
.btn-limpar { width: 100%; margin-top: 1rem; padding: 0.7rem; background: none; border: 1px solid #e5e7eb; border-radius: 8px; color: #6b7280; cursor: pointer; transition: all 0.2s; }
.btn-limpar:hover { background: #fee2e2; color: #ef4444; border-color: #ef4444; }
` },
      { name: "package.json", content: '{\n  "name": "react-vite-app",\n  "version": "0.0.0",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },\n  "dependencies": {\n    "react": "^18.3.0",\n    "react-dom": "^18.3.0"\n  },\n  "devDependencies": {\n    "@vitejs/plugin-react": "^4.2.0",\n    "vite": "^5.0.0"\n  }\n}\n' },
      { name: "vite.config.js", content: "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n" },
    ],
  },
};

function ProjectCard({
  project,
  onPress,
  onDelete,
  onExport,
  onSelect,
  onRename,
  onPush,
  isSelected,
}: {
  project: Project;
  onPress: () => void;
  onDelete: () => void;
  onExport: () => void;
  onSelect: () => void;
  onRename: () => void;
  onPush: () => void;
  isSelected: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(project.name, "OpÃÂ§ÃÂµes do Projeto", [
          { text: "Ã¢ÂÂÃ¯Â¸Â  Renomear", onPress: onRename },
          { text: "Ã°ÂÂÂ  Abrir no Editor", onPress },
          { text: "Ã°ÂÂÂ  Selecionar para combinar", onPress: onSelect },
          { text: "Ã°ÂÂÂ¦  Exportar como ZIP", onPress: onExport },
          { text: "Ã°ÂÂÂ¤  Enviar para GitHub/GitLab", onPress: onPush },
          { text: "Ã°ÂÂÂÃ¯Â¸Â  Excluir", style: "destructive", onPress: onDelete },
          { text: "Cancelar", style: "cancel" },
        ]);
      }}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.projectIcon, { backgroundColor: colors.secondary }]}>
          <Feather
            name={project.gitRepo ? "git-branch" : "folder"}
            size={16}
            color={project.gitRepo ? colors.success : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {project.name}
          </Text>
          {project.gitProvider && (
            <Text style={[styles.cardGit, { color: colors.mutedForeground }]}>
              {project.gitProvider === "github" ? "GitHub" : "GitLab"}
            </Text>
          )}
        </View>
        {isSelected && <Feather name="check-circle" size={18} color={colors.primary} />}
        <TouchableOpacity onPress={onExport} style={styles.exportBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="download" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      {project.description ? (
        <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {project.description}
        </Text>
      ) : null}
      <View style={styles.cardFooter}>
        <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
          {project.files.length} arquivo{project.files.length !== 1 ? "s" : ""}
        </Text>
        <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>
          {new Date(project.updatedAt).toLocaleDateString("pt-BR")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    projects,
    createProject,
    deleteProject,
    updateProject,
    setActiveProject,
    combineProjects,
    importGitRepo,
    pushToGit,
    gitConfigs,
    createFile,
    activeProject,
  } = useApp();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [showLibSearch, setShowLibSearch] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [template, setTemplate] = useState("vazio");

  const [gitUrl, setGitUrl] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [gitProvider, setGitProvider] = useState<"github" | "gitlab">("github");

  const [combineName, setCombineName] = useState("");
  const [importing, setImporting] = useState(false);

  const [showPushModal, setShowPushModal] = useState(false);
  const [pushProject, setPushProject] = useState<Project | null>(null);
  const [pushRepoUrl, setPushRepoUrl] = useState("");
  const [pushToken, setPushToken] = useState("");
  const [pushBranch, setPushBranch] = useState("main");
  const [pushing, setPushing] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    router.navigate("/(tabs)/editor");
  };

  const handleExportZip = async (project: Project) => {
    const ok = await exportZip(project);
    if (!ok) Alert.alert("Erro", "NÃÂ£o foi possÃÂ­vel exportar o projeto.");
  };

  const handleImportZip = async () => {
    setShowActionsMenu(false);
    try {
      const data = await importZip();
      if (!data) return;
      const proj = createProject(data.name, data.description);
      data.files.forEach((f) => createFile(proj.id, f.name, f.content));
      setActiveProject(proj);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Importado!", `Projeto "${data.name}" importado com ${data.files.length} arquivo(s).`);
    } catch {
      Alert.alert("Erro", "NÃÂ£o foi possÃÂ­vel importar o ZIP.");
    }
  };

  const handleImportTar = async () => {
    setShowActionsMenu(false);
    const data = await importTar();
    if (!data) return;
    const proj = createProject(data.name, data.description);
    data.files.forEach((f) => createFile(proj.id, f.name, f.content));
    setActiveProject(proj);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Importado!", `Projeto "${data.name}" criado.`);
  };

  const handleCreateProject = () => {
    const autoName = newName.trim() || `Projeto ${projects.length + 1}`;
    const tmpl = TEMPLATES[template];
    const proj = createProject(autoName, newDesc.trim());
    tmpl.files.forEach((f) => createFile(proj.id, f.name, f.content));
    setActiveProject(proj);
    setShowNewModal(false);
    setNewName("");
    setNewDesc("");
    setTemplate("vazio");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.navigate("/(tabs)/editor");
  };

  const handleImportGit = async () => {
    if (!gitUrl.trim()) return;
    setImporting(true);
    try {
      const token = gitToken || gitConfigs.find((g) => g.provider === gitProvider)?.token || "";
      const proj = await importGitRepo(gitUrl.trim(), token, gitProvider);
      setActiveProject(proj);
      setShowGitModal(false);
      setGitUrl("");
      setGitToken("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.navigate("/(tabs)/editor");
    } catch {
      Alert.alert("Erro", "NÃÂ£o foi possÃÂ­vel importar o repositÃÂ³rio.");
    } finally {
      setImporting(false);
    }
  };

  const handlePushToGit = async () => {
    if (!pushProject || !pushRepoUrl.trim() || !pushToken.trim()) return;
    setPushing(true);
    try {
      const result = await pushToGit(pushProject.id, pushRepoUrl.trim(), pushToken.trim(), pushBranch.trim() || "main");
      setShowPushModal(false);
      setPushRepoUrl("");
      setPushToken("");
      setPushBranch("main");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Ã¢ÂÂ Enviado!",
        `${result.pushed} arquivo(s) enviado(s) com sucesso!${result.errors > 0 ? `\n${result.errors} erro(s).` : ""}`
      );
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "NÃÂ£o foi possÃÂ­vel enviar para o repositÃÂ³rio.");
    } finally {
      setPushing(false);
    }
  };

  const handleCombine = () => {
    if (selectedProjects.length < 2 || !combineName.trim()) return;
    const combined = combineProjects(selectedProjects, combineName.trim());
    setActiveProject(combined);
    setSelectedProjects([]);
    setCombineName("");
    setShowCombineModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.navigate("/(tabs)/editor");
  };

  const handleRename = () => {
    if (!renameTarget || !renameValue.trim()) return;
    updateProject(renameTarget.id, { name: renameValue.trim() });
    if (activeProject?.id === renameTarget.id) {
      setActiveProject({ ...activeProject, name: renameValue.trim() });
    }
    setRenameTarget(null);
    setRenameValue("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleSelect = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.primary }]}>DevMobile</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>IDE no Celular</Text>
        </View>
        <View style={styles.headerActions}>
          {selectedProjects.length >= 2 && (
            <TouchableOpacity
              onPress={() => setShowCombineModal(true)}
              style={[styles.headerBtn, { backgroundColor: colors.accent }]}
            >
              <Feather name="layers" size={14} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowActionsMenu(true)}
            style={[styles.headerBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Feather name="more-horizontal" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowNewModal(true)}
            style={[styles.headerBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de ferramentas rÃÂ¡pidas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.toolBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {[
          { label: "Importar ZIP", icon: "upload", action: handleImportZip },
          { label: "Importar TAR", icon: "archive", action: handleImportTar },
          { label: "Git Clone", icon: "git-branch", action: () => setShowGitModal(true) },
          { label: "Bibliotecas", icon: "package", action: () => setShowLibSearch(true) },
          {
            label: "Plano do Projeto",
            icon: "map",
            action: () => {
              if (!activeProject) {
                Alert.alert("Sem projeto ativo", "Abra um projeto primeiro.");
                return;
              }
              setShowPlan(true);
            },
          },
        ].map((tool) => (
          <TouchableOpacity
            key={tool.label}
            onPress={tool.action}
            style={[styles.toolChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name={tool.icon as never} size={12} color={colors.primary} />
            <Text style={[styles.toolChipText, { color: colors.foreground }]}>{tool.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedProjects.length > 0 && (
        <View style={[styles.selectBanner, { backgroundColor: colors.accent }]}>
          <Text style={styles.selectText}>
            {selectedProjects.length} selecionado{selectedProjects.length > 1 ? "s" : ""}
          </Text>
          <TouchableOpacity onPress={() => setSelectedProjects([])}>
            <Text style={styles.selectCancel}>Limpar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => handleOpenProject(item)}
            onDelete={() =>
              Alert.alert("Excluir projeto", `Excluir "${item.name}"?`, [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", style: "destructive", onPress: () => deleteProject(item.id) },
              ])
            }
            onExport={() => handleExportZip(item)}
            onSelect={() => toggleSelect(item.id)}
            onRename={() => { setRenameTarget(item); setRenameValue(item.name); }}
            onPush={() => {
              setPushProject(item);
              setPushRepoUrl(item.gitRepo || "");
              setShowPushModal(true);
            }}
            isSelected={selectedProjects.includes(item.id)}
          />
        )}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: bottomPadding + 16,
          gap: 12,
          flexGrow: projects.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="code" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Comece um projeto</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Crie um projeto novo, importe um ZIP ou clone do GitHub/GitLab
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                onPress={() => setShowNewModal(true)}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={16} color={colors.primaryForeground} />
                <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>Criar Projeto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleImportZip}
                style={[styles.emptyBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
              >
                <Feather name="upload" size={16} color={colors.foreground} />
                <Text style={[styles.emptyBtnText, { color: colors.foreground }]}>Importar ZIP</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* Modal: Renomear Projeto */}
      <Modal visible={!!renameTarget} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setRenameTarget(null)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.renameBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground, marginBottom: 12 }]}>
                Ã¢ÂÂÃ¯Â¸Â  Renomear Projeto
              </Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.secondary }]}
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="Novo nome do projeto"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={handleRename}
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setRenameTarget(null)}
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.secondary }]}
                >
                  <Text style={[styles.primaryBtnText, { color: colors.foreground }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleRename}
                  disabled={!renameValue.trim()}
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: renameValue.trim() ? colors.primary : colors.secondary }]}
                >
                  <Feather name="check" size={14} color={renameValue.trim() ? colors.primaryForeground : colors.mutedForeground} />
                  <Text style={[styles.primaryBtnText, { color: renameValue.trim() ? colors.primaryForeground : colors.mutedForeground }]}>
                    Salvar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Enviar para GitHub/GitLab */}
      <Modal visible={showPushModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Ã°ÂÂÂ¤  Enviar para RepositÃÂ³rio
            </Text>
            <TouchableOpacity onPress={() => { setShowPushModal(false); setPushRepoUrl(""); setPushToken(""); }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {pushProject && (
              <View style={[styles.hintBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="folder" size={13} color={colors.primary} />
                <Text style={[styles.hintText, { color: colors.foreground, fontWeight: "600" }]}>
                  {pushProject.name}  ({pushProject.files?.length || 0} arquivo(s))
                </Text>
              </View>
            )}

            <View style={[styles.hintBox, { backgroundColor: colors.secondary, borderColor: colors.border, marginBottom: 14 }]}>
              <Feather name="info" size={13} color={colors.info} />
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                Cole a URL do repositÃÂ³rio e o token. Os arquivos do projeto serÃÂ£o enviados via API. O repositÃÂ³rio precisa existir antes.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>URL do RepositÃÂ³rio</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={pushRepoUrl}
              onChangeText={(t) => {
                setPushRepoUrl(t);
              }}
              placeholder="https://github.com/usuario/repositorio"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {pushRepoUrl.trim().length > 5 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Feather name="check-circle" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12 }}>
                  Detectado: {pushRepoUrl.includes("gitlab") ? "GitLab" : "GitHub"}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Token de Acesso{" "}
              <Text style={{ fontSize: 11 }}>(obrigatÃÂ³rio para enviar)</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={pushToken}
              onChangeText={setPushToken}
              placeholder={pushRepoUrl.includes("gitlab") ? "glpat-xxxxxxxxxxxx" : "ghp_xxxxxxxxxxxx"}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>Branch</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={pushBranch}
              onChangeText={setPushBranch}
              placeholder="main"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 16, lineHeight: 16 }}>
              {pushRepoUrl.includes("gitlab")
                ? "Token GitLab: gitlab.com Ã¢ÂÂ PreferÃÂªncias Ã¢ÂÂ Access Tokens Ã¢ÂÂ Adicionar (escopo: api, write_repository)"
                : "Token GitHub: github.com Ã¢ÂÂ Settings Ã¢ÂÂ Developer settings Ã¢ÂÂ Personal access tokens Ã¢ÂÂ (escopos: repo, contents:write)"}
            </Text>

            <TouchableOpacity
              onPress={handlePushToGit}
              disabled={!pushRepoUrl.trim() || !pushToken.trim() || pushing}
              style={[styles.primaryBtn, {
                backgroundColor: pushRepoUrl.trim() && pushToken.trim() && !pushing ? "#059669" : colors.muted
              }]}
            >
              <Feather name="upload-cloud" size={16} color="#fff" />
              <Text style={[styles.primaryBtnText, { color: "#fff" }]}>
                {pushing ? "Enviando..." : "Enviar para o RepositÃÂ³rio"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Menu de AÃÂ§ÃÂµes */}
      <Modal visible={showActionsMenu} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowActionsMenu(false)}
        >
          <View style={[styles.actionsMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.mutedForeground }]}>IMPORTAR</Text>
            {[
              { label: "Importar ZIP", icon: "upload", action: handleImportZip },
              { label: "Importar TAR/TAR.GZ", icon: "archive", action: handleImportTar },
              { label: "Clonar do GitHub", icon: "github", action: () => { setShowActionsMenu(false); setShowGitModal(true); } },
              { label: "Clonar do GitLab", icon: "git-branch", action: () => { setShowActionsMenu(false); setShowGitModal(true); } },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.action}
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
              >
                <Feather name={item.icon as never} size={16} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.foreground }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Novo Projeto */}
      <Modal visible={showNewModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Novo Projeto</Text>
            <TouchableOpacity onPress={() => setShowNewModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Nome do projeto <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>(opcional Ã¢ÂÂ auto-gerado se vazio)</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={newName}
              onChangeText={setNewName}
              placeholder={`Projeto ${projects.length + 1}`}
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>DescriÃÂ§ÃÂ£o (opcional)</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="DescriÃÂ§ÃÂ£o do projeto"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Template</Text>
            <View style={styles.templateGrid}>
              {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTemplate(key)}
                  style={[
                    styles.templateCard,
                    {
                      backgroundColor: template === key ? colors.primary : colors.card,
                      borderColor: template === key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={tmpl.icon as never}
                    size={18}
                    color={template === key ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.templateLabel,
                      { color: template === key ? colors.primaryForeground : colors.foreground },
                    ]}
                    numberOfLines={2}
                  >
                    {tmpl.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={handleCreateProject}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus-circle" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                Criar Projeto
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Git Import */}
      <Modal visible={showGitModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Importar do Git</Text>
            <TouchableOpacity onPress={() => setShowGitModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Dica visual */}
            <View style={[styles.hintBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="info" size={13} color={colors.info} />
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                Cole a URL do repositÃÂ³rio abaixo. GitHub e GitLab sÃÂ£o detectados automaticamente.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>URL do RepositÃÂ³rio</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={gitUrl}
              onChangeText={(text) => {
                setGitUrl(text);
                if (text.includes("gitlab")) setGitProvider("gitlab");
                else setGitProvider("github");
              }}
              placeholder="https://github.com/usuario/repositorio"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            {/* Detectado automaticamente */}
            {gitUrl.trim().length > 5 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Feather name="check-circle" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12 }}>
                  Detectado: {gitUrl.includes("gitlab") ? "GitLab" : "GitHub"}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Token de Acesso{" "}
              <Text style={{ fontSize: 11 }}>(opcional Ã¢ÂÂ para repositÃÂ³rios privados)</Text>
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={gitToken}
              onChangeText={setGitToken}
              placeholder={gitProvider === "github" ? "ghp_xxxxxxxxxxxx" : "glpat-xxxxxxxxxxxx"}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 14, lineHeight: 16 }}>
              {gitProvider === "github"
                ? "Token GitHub: github.com Ã¢ÂÂ Settings Ã¢ÂÂ Developer settings Ã¢ÂÂ Personal access tokens Ã¢ÂÂ Generate new token (selecione 'repo')"
                : "Token GitLab: gitlab.com Ã¢ÂÂ PreferÃÂªncias Ã¢ÂÂ Access Tokens Ã¢ÂÂ Adicionar (escopo: read_repository)"}
            </Text>

            <TouchableOpacity
              onPress={handleImportGit}
              disabled={!gitUrl.trim() || importing}
              style={[styles.primaryBtn, { backgroundColor: gitUrl.trim() && !importing ? colors.primary : colors.muted }]}
            >
              <Feather name="download-cloud" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                {importing ? "Importando..." : "Importar RepositÃÂ³rio"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Combinar */}
      <Modal visible={showCombineModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Combinar Projetos</Text>
            <TouchableOpacity onPress={() => setShowCombineModal(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
              Combinando {selectedProjects.length} projetos em um novo
            </Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Nome do projeto combinado</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={combineName}
              onChangeText={setCombineName}
              placeholder="Projeto Combinado"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <TouchableOpacity
              onPress={handleCombine}
              disabled={!combineName.trim()}
              style={[styles.primaryBtn, { backgroundColor: combineName.trim() ? colors.primary : colors.muted }]}
            >
              <Feather name="layers" size={16} color={colors.primaryForeground} />
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Combinar Projetos</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <LibrarySearch visible={showLibSearch} onClose={() => setShowLibSearch(false)} />
      <ProjectPlanModal visible={showPlan} onClose={() => setShowPlan(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toolBar: {
    maxHeight: 44,
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  toolChipText: { fontSize: 12, fontWeight: "500" },
  selectBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  selectText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  selectCancel: { color: "#fff", fontSize: 13 },
  card: { borderRadius: 12, padding: 14, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  projectIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardGit: { fontSize: 11, marginTop: 1 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  cardMeta: { fontSize: 11 },
  cardDate: { fontSize: 11 },
  exportBtn: { padding: 4 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", maxWidth: 260, lineHeight: 20 },
  emptyActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: "600" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  renameBox: {
    width: 300,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 8,
  },
  actionsMenu: {
    width: 280,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 8,
  },
  menuTitle: { fontSize: 10, fontWeight: "700", paddingHorizontal: 16, paddingBottom: 6, letterSpacing: 1 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: { fontSize: 15 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { padding: 20, gap: 8, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: "600", marginTop: 8, marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
  templateCard: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  templateLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  providerRow: { flexDirection: "row", gap: 10 },
  providerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  providerText: { fontSize: 14, fontWeight: "500" },
  sectionDesc: { fontSize: 14, marginBottom: 8 },
  hintBox: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8, alignItems: "flex-start" },
  hintText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
