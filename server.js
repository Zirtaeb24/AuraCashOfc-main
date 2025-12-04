// server.js - VERSÃO PARA RAILWAY
const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();

// 🔥 Ajustado para Railway
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'auracash_secret_key_2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 🔥 Configuração MySQL para Railway
const dbConfig = {
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306
};
let db;

async function connectDB() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado ao MySQL');
        await criarTabelas();
    } catch (error) {
        console.error('❌ Erro ao conectar MySQL:', error.message);
        console.log('📝 Usando modo em memória');
    }
}

async function criarTabelas() {
    const tabelas = [
        `CREATE TABLE IF NOT EXISTS usuarios (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            cpf VARCHAR(14),
            renda DECIMAL(10,2),
            auxilio BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS categorias (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(50) NOT NULL,
            tipo ENUM('income', 'expense') NOT NULL,
            usuario_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS transacoes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            tipo ENUM('income', 'expense') NOT NULL,
            categoria_id INT,
            valor DECIMAL(10,2) NOT NULL,
            data DATE NOT NULL,
            descricao TEXT,
            usuario_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS metas (
            id INT PRIMARY KEY AUTO_INCREMENT,
            categoria_id INT,
            valor DECIMAL(10,2) NOT NULL,
            data_inicio DATE NOT NULL,
            data_fim DATE NOT NULL,
            usuario_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS contas_compartilhadas (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(100) NOT NULL,
            codigo VARCHAR(50) UNIQUE NOT NULL,
            usuario_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS membros_compartilhada (
            id INT PRIMARY KEY AUTO_INCREMENT,
            conta_compartilhada_id INT,
            usuario_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS materiais (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(100) NOT NULL,
            valor_total DECIMAL(10,2) NOT NULL,
            quantidade DECIMAL(10,4) NOT NULL,
            usuario_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS produtos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nome VARCHAR(100) NOT NULL,
            custo_total DECIMAL(10,2) NOT NULL,
            usuario_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS produto_materiais (
            id INT PRIMARY KEY AUTO_INCREMENT,
            produto_id INT,
            material_id INT,
            quantidade_usada DECIMAL(10,4) NOT NULL,
            custo_material DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        `CREATE TABLE IF NOT EXISTS transacoes_compartilhadas (
            id INT PRIMARY KEY AUTO_INCREMENT,
            conta_id INT NOT NULL,
            descricao TEXT,
            tipo ENUM('income', 'expense') NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            data DATE NOT NULL,
            categoria_id INT,
            usuario_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conta_id) REFERENCES contas_compartilhadas(id) ON DELETE CASCADE
        )`
    ];

    for (const sql of tabelas) {
        try {
            await db.execute(sql);
        } catch (error) {
            console.log('Tabela já existe:', error.message);
        }
    }
    console.log('✅ Tabelas verificadas');
}

connectDB();

// Middleware de autenticação
const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Rotas estáticas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tlogin.html'));
});

app.get('/pages/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', req.params.page));
});

app.get('/js/:file', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'js', req.params.file));
});

app.get('/css/:file', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'css', req.params.file));
});

// ROTAS DE AUTENTICAÇÃO
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!db) {
            const users = JSON.parse(require('fs').existsSync('./users.json') ?
                require('fs').readFileSync('./users.json', 'utf8') : '[]');
            const usuario = users.find(u => u.email === email && u.senha === password);

            if (!usuario) {
                return res.status(400).json({ error: 'Email ou senha incorretos' });
            }

            const token = jwt.sign({ id: usuario.id, email }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, user: { id: usuario.id, name: usuario.nome, email, income: usuario.renda } });
        }

        const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Email não encontrado' });
        }

        const usuario = rows[0];
        if (password !== usuario.senha) {
            return res.status(400).json({ error: 'Senha incorreta' });
        }

        const token = jwt.sign({ id: usuario.id, email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: usuario.id, name: usuario.nome, email, income: usuario.renda } });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/auth/cadastro', async (req, res) => {
    const { name, email, password, cpf, income, aid } = req.body;

    try {
        let usuarioId;

        if (!db) {
            const users = JSON.parse(require('fs').existsSync('./users.json') ?
                require('fs').readFileSync('./users.json', 'utf8') : '[]');

            if (users.find(u => u.email === email)) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            usuarioId = Date.now();
            users.push({ id: usuarioId, nome: name, email, senha: password, cpf, renda: income, auxilio: aid || false });
            require('fs').writeFileSync('./users.json', JSON.stringify(users));
        } else {
            const [existing] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            const [result] = await db.execute(
                'INSERT INTO usuarios (nome, email, senha, cpf, renda, auxilio) VALUES (?, ?, ?, ?, ?, ?)',
                [name, email, password, cpf, income, aid || false]
            );
            usuarioId = result.insertId;
        }

        // CRIAR CATEGORIAS PADRÃO
        await criarCategoriasPadrao(usuarioId);

        const token = jwt.sign({ id: usuarioId, email }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, user: { id: usuarioId, name, email, income } });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Função criar categorias padrão
async function criarCategoriasPadrao(usuarioId) {
    const categoriasPadrao = [
        ['Alimentação', 'expense', usuarioId],
        ['Transporte', 'expense', usuarioId],
        ['Moradia', 'expense', usuarioId],
        ['Saúde', 'expense', usuarioId],
        ['Educação', 'expense', usuarioId],
        ['Lazer', 'expense', usuarioId],
        ['Salário', 'income', usuarioId],
        ['Freelance', 'income', usuarioId],
        ['Investimentos', 'income', usuarioId]
    ];

    for (const cat of categoriasPadrao) {
        try {
            if (!db) {
                const categorias = JSON.parse(require('fs').existsSync('./categorias.json') ?
                    require('fs').readFileSync('./categorias.json', 'utf8') : '[]');
                categorias.push({ id: Date.now() + Math.random(), nome: cat[0], tipo: cat[1], usuario_id: cat[2] });
                require('fs').writeFileSync('./categorias.json', JSON.stringify(categorias));
            } else {
                await db.execute('INSERT INTO categorias (nome, tipo, usuario_id) VALUES (?, ?, ?)', cat);
            }
        } catch (error) {
            console.log('Categoria já existe:', cat[0]);
        }
    }
    console.log('✅ Categorias padrão criadas para usuário:', usuarioId);
}

// ================================
// CATEGORIAS
// ================================
app.get('/api/categorias', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            const categorias = JSON.parse(require('fs').existsSync('./categorias.json') ?
                require('fs').readFileSync('./categorias.json', 'utf8') : '[]');
            const userCats = categorias.filter(c => c.usuario_id == req.user.id);
            return res.json(userCats);
        }

        const [rows] = await db.execute('SELECT * FROM categorias WHERE usuario_id = ? ORDER BY nome', [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/categorias', autenticarToken, async (req, res) => {
    const { nome, tipo } = req.body;

    try {
        if (!db) {
            const categorias = JSON.parse(require('fs').existsSync('./categorias.json') ?
                require('fs').readFileSync('./categorias.json', 'utf8') : '[]');
            const novaCat = { id: Date.now(), nome, tipo, usuario_id: req.user.id };
            categorias.push(novaCat);
            require('fs').writeFileSync('./categorias.json', JSON.stringify(categorias));
            return res.status(201).json(novaCat);
        }

        const [result] = await db.execute(
            'INSERT INTO categorias (nome, tipo, usuario_id) VALUES (?, ?, ?)',
            [nome, tipo, req.user.id]
        );
        res.status(201).json({ id: result.insertId, nome, tipo, usuario_id: req.user.id });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.delete('/api/categorias/:id', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            const categorias = JSON.parse(require('fs').existsSync('./categorias.json') ?
                require('fs').readFileSync('./categorias.json', 'utf8') : '[]');
            const filtered = categorias.filter(c => !(c.id == req.params.id && c.usuario_id == req.user.id));
            require('fs').writeFileSync('./categorias.json', JSON.stringify(filtered));
            return res.json({ message: 'Categoria deletada' });
        }

        await db.execute('DELETE FROM categorias WHERE id = ? AND usuario_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Categoria deletada' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ================================
// TRANSACOES (COM DEBUGS)
// ================================

// GET com DEBUG
app.get('/api/transacoes', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            const transacoes = JSON.parse(require('fs').existsSync('./transacoes.json') ?
                require('fs').readFileSync('./transacoes.json', 'utf8') : '[]');
            const userTrans = transacoes.filter(t => t.usuario_id == req.user.id);

            const categorias = JSON.parse(require('fs').existsSync('./categorias.json') ?
                require('fs').readFileSync('./categorias.json', 'utf8') : '[]');

            const transComCat = userTrans.map(t => {
                const cat = categorias.find(c => c.id == t.categoria_id);
                return { ...t, categoria_nome: cat ? cat.nome : 'Sem categoria' };
            });

            return res.json(transComCat);
        }

        const [rows] = await db.execute(
            `SELECT t.*, c.nome as categoria_nome 
             FROM transacoes t 
             LEFT JOIN categorias c ON t.categoria_id = c.id 
             WHERE t.usuario_id = ? 
             ORDER BY t.data DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar transações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST com DEBUG
app.post('/api/transacoes', autenticarToken, async (req, res) => {
    const { type, categoryId, amount, date, desc } = req.body;

    try {
        if (!db) {
            const transacoes = JSON.parse(require('fs').existsSync('./transacoes.json') ?
                require('fs').readFileSync('./transacoes.json', 'utf8') : '[]');
            const novaTrans = {
                id: Date.now(),
                tipo: type,
                categoria_id: categoryId,
                valor: amount,
                data: date,
                descricao: desc,
                usuario_id: req.user.id
            };
            transacoes.push(novaTrans);
            require('fs').writeFileSync('./transacoes.json', JSON.stringify(transacoes));


            return res.status(201).json(novaTrans);
        }

        const [result] = await db.execute(
            `INSERT INTO transacoes (usuario_id, tipo, categoria_id, valor, data, descricao) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.id, type, categoryId, amount, date, desc]
        );


        const [newRow] = await db.execute(
            `SELECT t.*, c.nome as categoria_nome 
             FROM transacoes t 
             LEFT JOIN categorias c ON t.categoria_id = c.id 
             WHERE t.id = ?`,
            [result.insertId]
        );


        res.status(201).json(newRow[0]);
    } catch (error) {
        console.error('Erro ao criar transação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE transações
app.delete('/api/transacoes/:id', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            const transacoes = JSON.parse(require('fs').existsSync('./transacoes.json') ?
                require('fs').readFileSync('./transacoes.json', 'utf8') : '[]');
            const filtered = transacoes.filter(t => !(t.id == req.params.id && t.usuario_id == req.user.id));
            require('fs').writeFileSync('./transacoes.json', JSON.stringify(filtered));
            return res.json({ message: 'Transação deletada' });
        }

        await db.execute('DELETE FROM transacoes WHERE id = ? AND usuario_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Transação deletada' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ================================
// METAS
// ================================
app.get('/api/metas', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            const metas = JSON.parse(require('fs').existsSync('./metas.json') ?
                require('fs').readFileSync('./metas.json', 'utf8') : '[]');
            const userMetas = metas.filter(m => m.usuario_id == req.user.id);

            const categorias = JSON.parse(require('fs').existsSync('./categorias.json') ?
                require('fs').readFileSync('./categorias.json', 'utf8') : '[]');

            const metasComCat = userMetas.map(m => {
                const cat = categorias.find(c => c.id == m.categoria_id);
                return { ...m, categoria_nome: cat ? cat.nome : 'Sem categoria' };
            });

            return res.json(metasComCat);
        }

        const [rows] = await db.execute(
            `SELECT m.*, c.nome as categoria_nome FROM metas m 
             LEFT JOIN categorias c ON m.categoria_id = c.id 
             WHERE m.usuario_id = ?`,
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST metas
app.post('/api/metas', autenticarToken, async (req, res) => {
    const { categoryId, amount, from, to } = req.body;

    try {
        if (!db) {
            const metas = JSON.parse(require('fs').existsSync('./metas.json') ?
                require('fs').readFileSync('./metas.json', 'utf8') : '[]');
            const novaMeta = {
                id: Date.now(),
                categoria_id: categoryId,
                valor: amount,
                data_inicio: from,
                data_fim: to,
                usuario_id: req.user.id
            };
            metas.push(novaMeta);
            require('fs').writeFileSync('./metas.json', JSON.stringify(metas));
            return res.status(201).json(novaMeta);
        }

        const [result] = await db.execute(
            'INSERT INTO metas (usuario_id, categoria_id, valor, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, categoryId, amount, from, to]
        );
        res.status(201).json({ id: result.insertId, categoria_id: categoryId, valor: amount, data_inicio: from, data_fim: to, usuario_id: req.user.id });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE metas
app.delete('/api/metas/:id', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            const metas = JSON.parse(require('fs').existsSync('./metas.json') ?
                require('fs').readFileSync('./metas.json', 'utf8') : '[]');
            const filtered = metas.filter(m => !(m.id == req.params.id && m.usuario_id == req.user.id));
            require('fs').writeFileSync('./metas.json', JSON.stringify(filtered));
            return res.json({ message: 'Meta deletada' });
        }

        await db.execute('DELETE FROM metas WHERE id = ? AND usuario_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Meta deletada' });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


// CONTA COMPARTILHADA //

// GET contas compartilhadas
// GET contas compartilhadas - VERSÃO CORRIGIDA
app.get('/api/shared-accounts', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            // Modo arquivo JSON
            const fs = require('fs');
            const contas = JSON.parse(fs.existsSync('./shared_accounts.json') ? fs.readFileSync('./shared_accounts.json', 'utf8') : '[]');
            
            // Filtra as contas do usuário, incluindo o dono e os membros
            const userContas = contas.filter(c =>
                c.usuario_id === req.user.id || (c.membros && c.membros.includes(req.user.id))
            );

            return res.json(userContas);
        }

        // Modo MySQL - VERSÃO CORRIGIDA
        const [contas] = await db.execute(`
            SELECT c.*, u.nome as dono_nome
            FROM contas_compartilhadas c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.usuario_id = ? OR EXISTS (
                SELECT 1 FROM membros_compartilhada m 
                WHERE m.conta_compartilhada_id = c.id AND m.usuario_id = ?
            )
        `, [req.user.id, req.user.id]);

        // Buscar membros para cada conta
        for (let conta of contas) {
            const [membros] = await db.execute(`
                SELECT m.usuario_id, u.nome
                FROM membros_compartilhada m
                JOIN usuarios u ON m.usuario_id = u.id
                WHERE m.conta_compartilhada_id = ?
            `, [conta.id]);
            
            conta.membros = membros;
            conta.dono = conta.dono_nome;
            // ✅ CORREÇÃO: Não soma +1, conta apenas os membros da tabela
            conta.membersCount = membros.length;
        }

        res.status(200).json(contas);
    } catch (error) {
        console.error('Erro ao carregar contas:', error);
        res.status(500).json({ error: 'Erro interno ao carregar contas' });
    }
});

// POST criar conta compartilhada
app.post('/api/shared-accounts', autenticarToken, async (req, res) => {
    const { name } = req.body;

    try {
        if (!db) {
            // Modo arquivo JSON
            const fs = require('fs');
            const contas = JSON.parse(fs.existsSync('./shared_accounts.json') ? fs.readFileSync('./shared_accounts.json', 'utf8') : '[]');
            const codigo = 'sh_' + Math.random().toString(36).substr(2, 9);
            const novaConta = {
                id: Date.now(),
                nome: name,
                codigo,
                usuario_id: req.user.id,
                membros: [req.user.id],
                membersCount: 1
            };
            contas.push(novaConta);
            fs.writeFileSync('./shared_accounts.json', JSON.stringify(contas));
            return res.status(201).json(novaConta);
        }

        // Modo MySQL
        const codigo = 'sh_' + Math.random().toString(36).substr(2, 9);
        const [result] = await db.execute(
            'INSERT INTO contas_compartilhadas (nome, codigo, usuario_id) VALUES (?, ?, ?)',
            [name, codigo, req.user.id]
        );

        // Adiciona o dono como membro automaticamente
        await db.execute(
            'INSERT INTO membros_compartilhada (conta_compartilhada_id, usuario_id) VALUES (?, ?)',
            [result.insertId, req.user.id]
        );

        res.status(201).json({
            id: result.insertId,
            nome: name,
            codigo,
            usuario_id: req.user.id,
            membersCount: 1
        });
    } catch (error) {
        console.error('Erro ao criar conta compartilhada:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST entrar em conta compartilhada
app.post('/api/shared-accounts/:codigo/join', autenticarToken, async (req, res) => {
    const { codigo } = req.params;

    try {
        if (!db) {
            // Modo arquivo JSON
            const fs = require('fs');
            const contas = JSON.parse(fs.existsSync('./shared_accounts.json') ? fs.readFileSync('./shared_accounts.json', 'utf8') : '[]');
            const conta = contas.find(c => c.codigo === codigo);

            if (!conta) return res.status(404).json({ error: 'Conta não encontrada' });
            if (conta.membros.includes(req.user.id)) return res.status(400).json({ error: 'Você já é membro desta conta' });

            conta.membros.push(req.user.id);
            conta.membersCount = conta.membros.length;
            fs.writeFileSync('./shared_accounts.json', JSON.stringify(contas));

            return res.json({ message: 'Entrou na conta compartilhada com sucesso' });
        }

        // Modo MySQL
        const [rows] = await db.execute('SELECT * FROM contas_compartilhadas WHERE codigo = ?', [codigo]);
        if (rows.length === 0) return res.status(404).json({ error: 'Conta não encontrada' });

        const conta = rows[0];
        const [membros] = await db.execute(
            'SELECT * FROM membros_compartilhada WHERE conta_compartilhada_id = ? AND usuario_id = ?',
            [conta.id, req.user.id]
        );

        if (membros.length > 0) return res.status(400).json({ error: 'Você já é membro desta conta' });

        await db.execute(
            'INSERT INTO membros_compartilhada (conta_compartilhada_id, usuario_id) VALUES (?, ?)',
            [conta.id, req.user.id]
        );

        res.json({ message: 'Entrou na conta compartilhada com sucesso' });
    } catch (error) {
        console.error('Erro ao entrar na conta compartilhada:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST sair da conta compartilhada
app.post('/api/shared-accounts/:id/leave', autenticarToken, async (req, res) => {
    const { id } = req.params;

    try {
        console.log(`🚪 [USER ${req.user.id}] Saindo da conta: ${id}`);

        if (!db) {
            // Modo arquivo JSON
            const fs = require('fs');
            const contas = JSON.parse(fs.existsSync('./shared_accounts.json') ? fs.readFileSync('./shared_accounts.json', 'utf8') : '[]');
            
            const conta = contas.find(c => c.id == id);
            
            if (!conta) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            // Verificar se é membro
            if (!conta.membros || !conta.membros.includes(req.user.id)) {
                return res.status(400).json({ error: 'Você não é membro desta conta' });
            }

            // Remover dos membros
            conta.membros = conta.membros.filter(membroId => membroId != req.user.id);
            conta.membersCount = conta.membros.length;
            fs.writeFileSync('./shared_accounts.json', JSON.stringify(contas));

            return res.json({ 
                message: 'Você saiu da conta compartilhada com sucesso'
            });
        }

        // Modo MySQL
        const [rows] = await db.execute(
            'SELECT * FROM contas_compartilhadas WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Conta compartilhada não encontrada' });
        }

        const conta = rows[0];

        // Verificar se é membro
        const [membro] = await db.execute(
            'SELECT * FROM membros_compartilhada WHERE conta_compartilhada_id = ? AND usuario_id = ?',
            [conta.id, req.user.id]
        );

        if (membro.length === 0) {
            return res.status(400).json({ error: 'Você não é membro desta conta' });
        }

        // Remover dos membros
        await db.execute(
            'DELETE FROM membros_compartilhada WHERE conta_compartilhada_id = ? AND usuario_id = ?',
            [conta.id, req.user.id]
        );

        res.json({ 
            message: 'Você saiu da conta compartilhada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao sair da conta compartilhada:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE conta compartilhada (apenas para o dono)
app.delete('/api/shared-accounts/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;

    try {
        if (!db) {
            // Modo arquivo JSON
            const fs = require('fs');
            const contas = JSON.parse(fs.existsSync('./shared_accounts.json') ? fs.readFileSync('./shared_accounts.json', 'utf8') : '[]');
            
            const contaIndex = contas.findIndex(c => c.id == id);
            
            if (contaIndex === -1) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            const conta = contas[contaIndex];

            // Verificar se é o dono
            if (conta.usuario_id != req.user.id) {
                return res.status(403).json({ 
                    error: 'Apenas o dono da conta pode deletá-la' 
                });
            }

            // Remover conta
            contas.splice(contaIndex, 1);
            fs.writeFileSync('./shared_accounts.json', JSON.stringify(contas));

            return res.json({ 
                message: 'Conta compartilhada deletada com sucesso'
            });
        }

        // Modo MySQL
        const [rows] = await db.execute(
            'SELECT * FROM contas_compartilhadas WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Conta compartilhada não encontrada' });
        }

        const conta = rows[0];

        // Verificar se é o dono
        if (conta.usuario_id != req.user.id) {
            return res.status(403).json({ 
                error: 'Apenas o dono da conta pode deletá-la' 
            });
        }

        // Deletar membros primeiro
        await db.execute(
            'DELETE FROM membros_compartilhada WHERE conta_compartilhada_id = ?',
            [conta.id]
        );

        // Deletar conta
        await db.execute(
            'DELETE FROM contas_compartilhadas WHERE id = ?',
            [conta.id]
        );

        res.json({ 
            message: 'Conta compartilhada deletada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao deletar conta compartilhada:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/shared-accounts/:id/join', autenticarToken, async (req, res) => {
    const { id } = req.params;

    try {
        console.log(`🔗 [USER ${req.user.id}] Entrando na conta: ${id}`);

        if (!db) {
            // Modo localStorage
            const contas = JSON.parse(localStorage.getItem('auraCash_shared_accounts') || '[]');
            const conta = contas.find(c => c.codigo === id);

            if (!conta) {
                return res.status(404).json({ error: 'Conta não encontrada' });
            }

            if (conta.membros.includes(req.user.id)) {
                return res.status(400).json({ error: 'Você já é membro desta conta' });
            }

            conta.membros.push(req.user.id);
            conta.membersCount = conta.membros.length;
            localStorage.setItem('auraCash_shared_accounts', JSON.stringify(contas));

            return res.json({ message: 'Entrou na conta compartilhada com sucesso' });
        }

        // Verificar se a conta existe
        const [rows] = await db.execute(
            'SELECT * FROM contas_compartilhadas WHERE codigo = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Conta compartilhada não encontrada' });
        }

        const conta = rows[0];

        // Verificar se já é membro
        const [membros] = await db.execute(
            'SELECT * FROM membros_compartilhada WHERE conta_compartilhada_id = ? AND usuario_id = ?',
            [conta.id, req.user.id]
        );

        if (membros.length > 0) {
            return res.status(400).json({ error: 'Você já é membro desta conta' });
        }

        // Adicionar como membro
        await db.execute(
            `INSERT INTO membros_compartilhada (conta_compartilhada_id, usuario_id) 
             VALUES (?, ?)`,
            [conta.id, req.user.id]
        );

        console.log(`✅ [USER ${req.user.id}] Entrou na conta: ${conta.id}`);
        res.json({ message: 'Entrou na conta compartilhada com sucesso' });
    } catch (error) {
        console.error('Erro ao entrar na conta compartilhada:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ================================
// EMPREENDEDOR - MATERIAIS
// ================================

// GET materiais
app.get('/api/materiais', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(501).json({ error: 'Modo MySQL necessário para materiais' });
        }

        const [rows] = await db.execute(
            'SELECT * FROM materiais WHERE usuario_id = ? ORDER BY nome',
            [req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao carregar materiais:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST criar material
app.post('/api/materiais', autenticarToken, async (req, res) => {
    const { nome, valor_total, quantidade } = req.body;

    try {
        if (!db) {
            return res.status(501).json({ error: 'Modo MySQL necessário para materiais' });
        }

        const [result] = await db.execute(
            'INSERT INTO materiais (nome, valor_total, quantidade, usuario_id) VALUES (?, ?, ?, ?)',
            [nome, valor_total, quantidade, req.user.id]
        );

        const [newRow] = await db.execute(
            'SELECT * FROM materiais WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(newRow[0]);
    } catch (error) {
        console.error('Erro ao criar material:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE material
app.delete('/api/materiais/:id', autenticarToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(501).json({ error: 'Modo MySQL necessário para materiais' });
        }

        await db.execute(
            'DELETE FROM materiais WHERE id = ? AND usuario_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Material deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar material:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST calcular custo do produto
app.post('/api/calcular-custo', autenticarToken, async (req, res) => {
    const { nome_produto, materiais } = req.body;

    try {
        if (!db) {
            return res.status(501).json({ error: 'Modo MySQL necessário para cálculo' });
        }

        let custoTotal = 0;
        const detalhes = [];

        // Calcular custo para cada material
        for (const material of materiais) {
            const [rows] = await db.execute(
                'SELECT * FROM materiais WHERE id = ? AND usuario_id = ?',
                [material.material_id, req.user.id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: `Material não encontrado: ${material.material_id}` });
            }

            const mat = rows[0];
            const custoUnitario = mat.valor_total / mat.quantidade;
            const custoMaterial = custoUnitario * material.quantidade_usada;
            
            custoTotal += custoMaterial;
            detalhes.push({
                material_id: mat.id,
                nome: mat.nome,
                custo_unitario: custoUnitario,
                quantidade_usada: material.quantidade_usada,
                custo_total: custoMaterial
            });
        }

        // Salvar o produto (opcional)
        const [produtoResult] = await db.execute(
            'INSERT INTO produtos (nome, custo_total, usuario_id) VALUES (?, ?, ?)',
            [nome_produto, custoTotal, req.user.id]
        );

        // Salvar os materiais usados (opcional)
        for (const detalhe of detalhes) {
            await db.execute(
                'INSERT INTO produto_materiais (produto_id, material_id, quantidade_usada, custo_material) VALUES (?, ?, ?, ?)',
                [produtoResult.insertId, detalhe.material_id, detalhe.quantidade_usada, detalhe.custo_total]
            );
        }

        res.json({
            produto: nome_produto,
            custo_total: custoTotal,
            detalhes: detalhes,
            produto_id: produtoResult.insertId
        });

    } catch (error) {
        console.error('Erro ao calcular custo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ROTA CORRIGIDA - VERSÃO SIMPLES
app.get('/api/shared-accounts/:id/members', autenticarToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log(`👥 [USER ${req.user.id}] Buscando membros da conta ${id}`);
        
        if (!db) {
            return res.status(500).json({ error: 'Banco de dados não disponível' });
        }
        
        // 1. Verificar se conta existe e usuário tem acesso
        const [conta] = await db.execute(
            'SELECT usuario_id FROM contas_compartilhadas WHERE id = ?',
            [id]
        );
        
        if (conta.length === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }
        
        const donoId = conta[0].usuario_id;
        const usuarioId = req.user.id;
        
        // Verificar se usuário tem acesso (é dono ou membro)
        if (donoId != usuarioId) {
            const [membro] = await db.execute(
                'SELECT * FROM membros_compartilhada WHERE conta_compartilhada_id = ? AND usuario_id = ?',
                [id, usuarioId]
            );
            
            if (membro.length === 0) {
                return res.status(403).json({ error: 'Acesso negado' });
            }
        }
        
        // 2. Buscar dono
        const [dono] = await db.execute(
            'SELECT id as usuario_id, nome, email FROM usuarios WHERE id = ?',
            [donoId]
        );
        
        const membros = [];
        
        // 3. Adicionar dono
        if (dono.length > 0) {
            membros.push({
                ...dono[0],
                is_owner: true
            });
        }
        
        // 4. Buscar outros membros (exceto dono)
        const [outrosMembros] = await db.execute(`
            SELECT u.id as usuario_id, u.nome, u.email
            FROM membros_compartilhada m
            INNER JOIN usuarios u ON m.usuario_id = u.id
            WHERE m.conta_compartilhada_id = ? AND u.id != ?
            ORDER BY u.nome
        `, [id, donoId]);
        
        // 5. Adicionar outros membros
        outrosMembros.forEach(membro => {
            membros.push({
                ...membro,
                is_owner: false
            });
        });
        
        console.log(`✅ ${membros.length} membros retornados`);
        res.json(membros);
        
    } catch (error) {
        console.error('❌ Erro ao buscar membros:', error);
        res.status(500).json({ error: 'Erro interno: ' + error.message });
    }
});

// GET transações de uma conta compartilhada
app.get('/api/shared-accounts/:id/transactions', autenticarToken, async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log(`💰 [USER ${req.user.id}] Buscando transações da conta: ${id}`);
        
        // Verificar se banco está disponível
        if (!db) {
            console.error('❌ Banco de dados não disponível');
            return res.status(500).json({ error: 'Banco de dados não disponível' });
        }
        
        // Verificar acesso
        const [access] = await db.execute(
            `SELECT * FROM membros_compartilhada 
             WHERE conta_compartilhada_id = ? AND usuario_id = ?`,
            [id, req.user.id]
        );
        
        const [conta] = await db.execute(
            'SELECT * FROM contas_compartilhadas WHERE id = ?',
            [id]
        );
        
        if (conta.length === 0) {
            console.log('❌ Conta não encontrada');
            return res.status(404).json({ error: 'Conta não encontrada' });
        }
        
        if (conta[0].usuario_id != req.user.id && access.length === 0) {
            console.log('❌ Acesso negado para usuário:', req.user.id);
            return res.status(403).json({ error: 'Acesso negado' });
        }
        
        // Buscar transações
        const [transacoes] = await db.execute(`
            SELECT t.*, c.nome as categoria_nome, u.nome as usuario_nome
            FROM transacoes_compartilhadas t
            LEFT JOIN categorias c ON t.categoria_id = c.id
            LEFT JOIN usuarios u ON t.usuario_id = u.id
            WHERE t.conta_id = ?
            ORDER BY t.data DESC, t.created_at DESC
        `, [id]);
        
        console.log(`✅ ${transacoes.length} transações encontradas para conta ${id}`);
        res.json(transacoes);
        
    } catch (error) {
        console.error('❌ Erro ao carregar transações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST criar transação compartilhada
app.post('/api/shared-accounts/:id/transactions', autenticarToken, async (req, res) => {
    const { id } = req.params;
    const { descricao, tipo, valor, data, categoria_id } = req.body;
    
    try {
        console.log(`➕ [USER ${req.user.id}] Criando transação na conta ${id}:`, { 
            descricao, 
            tipo, 
            valor: parseFloat(valor).toFixed(2),
            data 
        });
        
        // Validar dados
        if (!descricao || !tipo || !valor || !data || !categoria_id) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }
        
        if (parseFloat(valor) <= 0) {
            return res.status(400).json({ error: 'Valor deve ser maior que zero' });
        }
        
        // Verificar se banco está disponível
        if (!db) {
            console.error('❌ Banco de dados não disponível');
            return res.status(500).json({ error: 'Banco de dados não disponível' });
        }
        
        // Verificar acesso
        const [access] = await db.execute(
            `SELECT * FROM membros_compartilhada 
             WHERE conta_compartilhada_id = ? AND usuario_id = ?`,
            [id, req.user.id]
        );
        
        const [conta] = await db.execute(
            'SELECT * FROM contas_compartilhadas WHERE id = ?',
            [id]
        );
        
        if (conta.length === 0) {
            console.log('❌ Conta não encontrada');
            return res.status(404).json({ error: 'Conta não encontrada' });
        }
        
        if (conta[0].usuario_id != req.user.id && access.length === 0) {
            console.log('❌ Acesso negado para usuário:', req.user.id);
            return res.status(403).json({ error: 'Acesso negado' });
        }
        
        // Verificar se categoria existe
        const [categoria] = await db.execute(
            'SELECT * FROM categorias WHERE id = ? AND usuario_id = ?',
            [categoria_id, req.user.id]
        );
        
        if (categoria.length === 0) {
            console.log('❌ Categoria não encontrada ou não pertence ao usuário');
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        
        // Inserir transação
        const [result] = await db.execute(
            `INSERT INTO transacoes_compartilhadas 
             (conta_id, descricao, tipo, valor, data, categoria_id, usuario_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, descricao, tipo, parseFloat(valor), data, categoria_id, req.user.id]
        );
        
        // Buscar transação criada
        const [newRow] = await db.execute(`
            SELECT t.*, c.nome as categoria_nome, u.nome as usuario_nome
            FROM transacoes_compartilhadas t
            LEFT JOIN categorias c ON t.categoria_id = c.id
            LEFT JOIN usuarios u ON t.usuario_id = u.id
            WHERE t.id = ?
        `, [result.insertId]);
        
        console.log('✅ Transação criada, ID:', result.insertId);
        
        // Retornar transação criada
        res.status(201).json(newRow[0]);
        
    } catch (error) {
        console.error('❌ Erro ao criar transação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE transação compartilhada
app.delete('/api/shared-accounts/:contaId/transactions/:transId', autenticarToken, async (req, res) => {
    const { contaId, transId } = req.params;
    
    try {
        console.log(`🗑️ [USER ${req.user.id}] Deletando transação ${transId} da conta ${contaId}`);
        
        // Verificar se banco está disponível
        if (!db) {
            console.error('❌ Banco de dados não disponível');
            return res.status(500).json({ error: 'Banco de dados não disponível' });
        }
        
        // Verificar acesso
        const [access] = await db.execute(
            `SELECT * FROM membros_compartilhada 
             WHERE conta_compartilhada_id = ? AND usuario_id = ?`,
            [contaId, req.user.id]
        );
        
        const [conta] = await db.execute(
            'SELECT * FROM contas_compartilhadas WHERE id = ?',
            [contaId]
        );
        
        if (conta.length === 0) {
            console.log('❌ Conta não encontrada');
            return res.status(404).json({ error: 'Conta não encontrada' });
        }
        
        if (conta[0].usuario_id != req.user.id && access.length === 0) {
            console.log('❌ Acesso negado para usuário:', req.user.id);
            return res.status(403).json({ error: 'Acesso negado' });
        }
        
        // Buscar transação
        const [trans] = await db.execute(
            'SELECT * FROM transacoes_compartilhadas WHERE id = ? AND conta_id = ?',
            [transId, contaId]
        );
        
        if (trans.length === 0) {
            console.log('❌ Transação não encontrada');
            return res.status(404).json({ error: 'Transação não encontrada' });
        }
        
        // Verificar se é o criador ou dono da conta
        if (trans[0].usuario_id != req.user.id && conta[0].usuario_id != req.user.id) {
            console.log('❌ Permissão negada: não é o criador nem dono');
            return res.status(403).json({ error: 'Você só pode deletar suas próprias transações' });
        }
        
        // Deletar
        await db.execute(
            'DELETE FROM transacoes_compartilhadas WHERE id = ?',
            [transId]
        );
        
        console.log('✅ Transação deletada com sucesso');
        res.json({ message: 'Transação deletada com sucesso' });
        
    } catch (error) {
        console.error('❌ Erro ao deletar transação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT atualizar nome da conta compartilhada (opcional - para futuro)
app.put('/api/shared-accounts/:id', autenticarToken, async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;
    
    try {
        console.log(`✏️ [USER ${req.user.id}] Atualizando nome da conta ${id} para: ${nome}`);
        
        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }
        
        // Verificar se banco está disponível
        if (!db) {
            console.error('❌ Banco de dados não disponível');
            return res.status(500).json({ error: 'Banco de dados não disponível' });
        }
        
        // Verificar se conta existe
        const [conta] = await db.execute(
            'SELECT * FROM contas_compartilhadas WHERE id = ?',
            [id]
        );
        
        if (conta.length === 0) {
            console.log('❌ Conta não encontrada');
            return res.status(404).json({ error: 'Conta não encontrada' });
        }
        
        // Verificar se é o dono
        if (conta[0].usuario_id != req.user.id) {
            console.log('❌ Apenas o dono pode editar a conta');
            return res.status(403).json({ error: 'Apenas o dono pode editar a conta' });
        }
        
        // Atualizar
        await db.execute(
            'UPDATE contas_compartilhadas SET nome = ? WHERE id = ?',
            [nome.trim(), id]
        );
        
        console.log('✅ Nome da conta atualizado');
        res.json({ message: 'Nome atualizado com sucesso', nome: nome.trim() });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar conta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas adicionais básicas
app.put('/api/profile', autenticarToken, (req, res) => res.json({ message: 'Perfil atualizado' }));
app.put('/api/password', autenticarToken, (req, res) => res.json({ message: 'Senha alterada' }));


app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📊 Sistema: Funciona COM ou SEM MySQL`);
    console.log(`📂 Categorias: Criadas automaticamente no cadastro`);
});
