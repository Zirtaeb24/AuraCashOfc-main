// js/transacoes.js - VERSÃO CORRIGIDA
class TransacoesManager {
    constructor() {
        this.form = document.getElementById('txForm');
        this.table = document.getElementById('txTable');
        this.categorias = [];
        this.init();
    }

    async init() {
        this.setupForm();
        await this.loadCategorias();
        await this.loadTransacoes();
    }

    setupForm() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveTransacao();
        });

        document.getElementById('txType').addEventListener('change', (e) => {
            this.filterCategoriasByType(e.target.value);
        });
    }

    async loadCategorias() {
        try {
            const categorias = await app.apiCall('/categorias', { method: 'GET' });
            // Filtrar categorias do usuário logado
            if (app.currentUser && app.currentUser.user) {
                const userId = app.currentUser.user.id;
                this.categorias = categorias.filter(cat => cat.usuario_id === userId);
            } else {
                this.categorias = [];
            }
            this.filterCategoriasByType('expense');
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    filterCategoriasByType(type) {
        const select = document.getElementById('txCategory');
        const categoriasFiltradas = this.categorias.filter(cat => cat.tipo === type);

        select.innerHTML = categoriasFiltradas.map(cat =>
            `<option value="${cat.id}">${cat.nome}</option>`
        ).join('') || '<option value="">Nenhuma categoria disponível</option>';
    }

    async saveTransacao() {
        const formData = new FormData(this.form);

        // ✅ CORREÇÃO: Usar o nome correto do campo no HTML
        const amountInput = document.getElementById('txAmount').value;
        const amount = parseFloat(amountInput);

        console.log('💰 Debug valor:', { input: amountInput, converted: amount });

        // Validações
        if (isNaN(amount) || amount <= 0) {
            Utils.showMessage('Digite um valor válido maior que zero', 'error');
            return;
        }

        const transacao = {
            type: formData.get('type'),
            categoryId: parseInt(formData.get('categoryId')),
            amount: amount, // ✅ Isso vai ser salvo como 'valor' no backend
            date: formData.get('date'),
            desc: formData.get('desc')
        };

        Utils.showLoading();
        try {
            await app.apiCall('/transacoes', {
                method: 'POST',
                body: JSON.stringify(transacao)
            });

            this.form.reset();
            // Resetar a data para hoje
            document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
            await this.loadTransacoes();
            Utils.showMessage('Transação salva com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            Utils.showMessage('Erro ao salvar transação', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async loadTransacoes() {
        try {
            const transacoes = await app.apiCall('/transacoes', { method: 'GET' });
            this.renderTransacoes(transacoes);
        } catch (error) {
            console.error('Erro ao carregar transações:', error);
        }
    }

    renderTransacoes(transacoes) {
        const tbody = this.table.querySelector('tbody');

        if (transacoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="small">Nenhuma transação encontrada</td></tr>';
            return;
        }

        // Ordenar por data (mais recente primeiro)
        transacoes.sort((a, b) => new Date(b.data) - new Date(a.data));

        tbody.innerHTML = transacoes.map(transacao => {
            const categoria = this.categorias.find(c => c.id === transacao.categoria_id);
            return `
                <tr>
                    <td>${Utils.formatDate(transacao.data)}</td>
                    <td>
                        <span class="badge" style="background: ${transacao.tipo === 'income' ? 'var(--ok)' : 'var(--danger)'}">
                            ${transacao.tipo === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                    </td>
                    <td>${categoria?.nome || 'Sem categoria'}</td>
                    <td style="color: ${transacao.tipo === 'income' ? 'var(--ok)' : 'var(--danger)'}; font-weight: bold">
                        ${Utils.formatCurrency(transacao.valor)}
                    </td>
                    <td>${transacao.descricao || '-'}</td>
                    <td>${transacao.comprovante ? '📎' : '-'}</td>
                    <td>
                        <button class="btn btn-danger" onclick="transacoesManager.deleteTransacao(${transacao.id})">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async deleteTransacao(id) {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        Utils.showLoading();
        try {
            await app.apiCall(`/transacoes/${id}`, { method: 'DELETE' });
            await this.loadTransacoes();
            Utils.showMessage('Transação excluída com sucesso!', 'success');
        } catch (error) {
            Utils.showMessage('Erro ao excluir transação', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async limparTodasTransacoes() {
        if (!confirm('🚨 ATENÇÃO: Isso irá excluir TODAS as transações. Esta ação não pode ser desfeita. Continuar?')) {
            return;
        }

        Utils.showLoading();
        try {
            // Carregar todas as transações
            const transacoes = await app.apiCall('/transacoes', { method: 'GET' });

            // Excluir uma por uma
            for (const transacao of transacoes) {
                await app.apiCall(`/transacoes/${transacao.id}`, { method: 'DELETE' });
            }

            await this.loadTransacoes();
            Utils.showMessage('✅ Todas as transações foram excluídas!', 'success');
        } catch (error) {
            console.error('❌ Erro ao limpar transações:', error);
            Utils.showMessage('❌ Erro ao limpar transações', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

}

// Inicializar na página de transações
if (document.getElementById('txForm')) {
    var transacoesManager = new TransacoesManager();
}