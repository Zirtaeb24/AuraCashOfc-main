// public/js/dashboard.js - VERSÃO DEFINITIVA CORRIGIDA
class DashboardManager {
    constructor() {
        this.categorias = [];
        this.init();
    }

    async init() {
        console.log('📊 Inicializando dashboard...');
        await this.loadCategorias();
        await this.loadKPIs();
        await this.loadLastTransactions();
        await this.loadBadges();
    }

    async loadCategorias() {
        try {
            this.categorias = await app.apiCall('/categorias', { method: 'GET' });
            console.log('📂 Categorias carregadas:', this.categorias.length);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            this.categorias = [];
        }
    }

    async loadKPIs() {
        try {
            const transacoes = await app.apiCall('/transacoes', { method: 'GET' });
            console.log('Transações para KPIs:', transacoes); // DEBUG

            // ✅ CORREÇÃO: Usar TODAS as transações primeiro para testar
            const transacoesMes = transacoes;

            console.log('Transações do mês:', transacoesMes);

            // ✅ CORREÇÃO: Usar APENAS t.valor
            const receitas = transacoesMes
                .filter(t => t.tipo === 'income')
                .reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

            const despesas = transacoesMes
                .filter(t => t.tipo === 'expense')
                .reduce((sum, t) => sum + (parseFloat(t.valor) || 0), 0);

            const saldo = receitas - despesas;

            console.log('Receitas:', receitas, 'Despesas:', despesas, 'Saldo:', saldo);

            document.getElementById('kpiIncome').textContent = Utils.formatCurrency(receitas);
            document.getElementById('kpiExpense').textContent = Utils.formatCurrency(despesas);
            document.getElementById('kpiBalance').textContent = Utils.formatCurrency(saldo);

            const balanceElement = document.getElementById('kpiBalance');
            balanceElement.style.color = saldo >= 0 ? 'var(--ok)' : 'var(--danger)';

        } catch (error) {
            console.error('Erro ao carregar KPIs:', error);
        }
    }

    async loadLastTransactions() {
        try {
            const transacoes = await app.apiCall('/transacoes', { method: 'GET' });
            const lastFive = transacoes
                .sort((a, b) => new Date(b.data) - new Date(a.data))
                .slice(0, 5);

            const tbody = document.querySelector('#lastTx tbody');

            if (transacoes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="small">Nenhuma transação encontrada</td></tr>';
                return;
            }

            tbody.innerHTML = lastFive.map(transacao => {
                const categoria = this.categorias.find(c => c.id === transacao.categoria_id);
                const nomeCategoria = categoria ? categoria.nome : (transacao.categoria_nome || 'Sem categoria');

                // ✅ CORREÇÃO: Usar APENAS transacao.valor
                const valor = transacao.valor;

                return `
                <tr>
                    <td>${Utils.formatDate(transacao.data)}</td>
                    <td>
                        <span class="badge" style="background: ${transacao.tipo === 'income' ? 'var(--ok)' : 'var(--danger)'}">
                            ${transacao.tipo === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                    </td>
                    <td>${nomeCategoria}</td>
                    <td style="color: ${transacao.tipo === 'income' ? 'var(--ok)' : 'var(--danger)'}">
                        ${Utils.formatCurrency(valor)}
                    </td>
                    <td>${transacao.descricao || '-'}</td>
                </tr>
            `;
            }).join('');

        } catch (error) {
            console.error('Erro ao carregar transações:', error);
        }
    }

    async loadBadges() {
        try {
            const metas = await app.apiCall('/metas', { method: 'GET' });
            const transacoes = await app.apiCall('/transacoes', { method: 'GET' });

            const badges = [
                {
                    name: '💳 Primeira Transação',
                    earned: transacoes.length > 0,
                    description: 'Realizou a primeira transação'
                },
                {
                    name: '🎯 Meta Setter',
                    earned: metas.length > 0,
                    description: 'Criou a primeira meta'
                },
                {
                    name: '💼 Empreendedor',
                    earned: localStorage.getItem('auraCash_materiais'),
                    description: 'Usou a área do empreendedor'
                },
                {
                    name: '📊 Analista',
                    earned: transacoes.length >= 10,
                    description: 'Registrou 10+ transações'
                }
            ];

            const badgesContainer = document.getElementById('badges');
            badgesContainer.innerHTML = badges.map(badge => `
                <div class="badge" style="
                    background: ${badge.earned ? 'var(--primary)' : '#e0e0e0'}; 
                    color: ${badge.earned ? 'white' : '#666'};
                    margin: 5px;
                    display: inline-block;
                ">
                    ${badge.name}
                    ${badge.earned ? '✓' : '🔒'}
                </div>
            `).join('');

        } catch (error) {
            console.error('Erro ao carregar badges:', error);
        }
    }
}

if (document.getElementById('kpiIncome')) {
    new DashboardManager();
}