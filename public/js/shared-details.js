// js/shared-details.js - Tela de detalhes da conta compartilhada (ATUALIZADO)
class SharedDetailsManager {
    constructor() {
        this.accountId = null;
        this.accountData = null;
        this.transactions = [];
        this.members = [];
        this.categories = [];
        this.init();
    }

    async init() {
        console.log('🔍 Inicializando detalhes da conta compartilhada...');
        
        // Obter ID da conta da URL
        const urlParams = new URLSearchParams(window.location.search);
        this.accountId = urlParams.get('id');
        
        if (!this.accountId) {
            Utils.showMessage('❌ ID da conta não especificado', 'error');
            window.location.href = 'tcompartilhada.html';
            return;
        }
        
        // Debug: Verificar usuário atual
        this.debugUserInfo();
        
        this.setupForms();
        this.setCurrentDate();
        await this.loadAccountData();
        await this.loadCategories();
        
        // Mostrar aba padrão (transações)
        this.showTab('transactions');
    }

    debugUserInfo() {
        console.log('👤 DEBUG - Informações do usuário:');
        console.log('currentUser:', app.currentUser);
        console.log('currentUser.id:', app.currentUser?.id);
        console.log('currentUser.user:', app.currentUser?.user);
        console.log('currentUser.user.id:', app.currentUser?.user?.id);
        console.log('currentUser.userId:', app.currentUser?.userId);
    }

    getUserId() {
        // Compatibilidade com diferentes estruturas de usuário
        if (app.currentUser && app.currentUser.user && app.currentUser.user.id) {
            return app.currentUser.user.id;
        } else if (app.currentUser && app.currentUser.id) {
            return app.currentUser.id;
        } else if (app.currentUser && app.currentUser.userId) {
            return app.currentUser.userId;
        }
        
        console.error('❌ Não foi possível obter o ID do usuário');
        return null;
    }

    setupForms() {
        const addTransactionForm = document.getElementById('addTransactionForm');
        if (addTransactionForm) {
            addTransactionForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.addTransaction();
            });
        }

        // Filtrar categorias quando mudar o tipo
        const typeSelect = document.getElementById('transactionType');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                this.filterCategoriesByType(typeSelect.value);
            });
        }
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('transactionDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = today;
        }
    }

    showTab(tabName) {
        // Esconder todas as abas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Remover classe ativa de todos os botões
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar aba selecionada
        const tabElement = document.getElementById(`${tabName}-tab`);
        if (tabElement) {
            tabElement.style.display = 'block';
        }
        
        // Adicionar classe ativa ao botão
        const button = document.querySelector(`[data-tab="${tabName}"]`);
        if (button) {
            button.classList.add('active');
        }
        
        // Carregar dados específicos da aba
        if (tabName === 'transactions') {
            this.loadTransactions();
        } else if (tabName === 'members') {
            this.loadMembers();
        } else if (tabName === 'add') {
            this.filterCategoriesByType('expense'); // Padrão: despesas
        }
    }

    async loadAccountData() {
        try {
            console.log(`🔄 Carregando dados da conta ${this.accountId}...`);
            
            // Buscar todas as contas do usuário
            const accounts = await app.apiCall('/shared-accounts');
            this.accountData = accounts.find(acc => acc.id == this.accountId);
            
            if (!this.accountData) {
                Utils.showMessage('❌ Conta não encontrada ou acesso negado', 'error');
                window.location.href = 'tcompartilhada.html';
                return;
            }
            
            this.renderAccountHeader();
            
        } catch (error) {
            console.error('Erro ao carregar dados da conta:', error);
            Utils.showMessage('❌ Erro ao carregar dados da conta', 'error');
        }
    }

    renderAccountHeader() {
        // Atualizar informações do cabeçalho
        const accountName = document.getElementById('accountName');
        const accountCode = document.getElementById('accountCode');
        const ownerBadge = document.getElementById('ownerBadge');
        const membersBadge = document.getElementById('membersBadge');
        const membersCount = document.getElementById('membersCount');
        const inviteLink = document.getElementById('inviteLink');
        const inviteCode = document.getElementById('inviteCode');
        
        if (accountName) accountName.textContent = this.accountData.nome;
        if (accountCode) accountCode.textContent = this.accountData.codigo;
        
        // Verificar se é o dono
        const userId = this.getUserId();
        const isOwner = this.accountData.usuario_id == userId;
        
        if (ownerBadge) {
            ownerBadge.textContent = isOwner ? 
                `👑 Dono: Você` : `👑 Dono: ${this.accountData.dono || 'Desconhecido'}`;
        }
        
        // Atualizar contador de membros
        const membersCountValue = this.accountData.membersCount || this.accountData.membros?.length || 1;
        if (membersCount) membersCount.textContent = membersCountValue;
        if (membersBadge) membersBadge.textContent = `👥 ${membersCountValue} membro(s)`;
        
        // Atualizar link de convite
        if (inviteLink) {
            inviteLink.value = `${window.location.origin}/pages/tcompartilhada.html?join=${this.accountData.codigo}`;
        }
        if (inviteCode) {
            inviteCode.textContent = this.accountData.codigo;
        }
    }

    async loadMembers() {
        try {
            console.log('🔄 Carregando membros...');
            
            // Verificar se a rota existe
            try {
                const response = await app.apiCall(`/shared-accounts/${this.accountId}/members`);
                
                if (response && Array.isArray(response)) {
                    this.members = response;
                    console.log(`✅ ${this.members.length} membros carregados`);
                } else {
                    this.members = [];
                    console.log('ℹ️ Nenhum membro encontrado ou erro na resposta');
                }
            } catch (apiError) {
                console.log('⚠️ Rota de membros não disponível, usando dados da conta');
                // Usar membros dos dados da conta se disponíveis
                if (this.accountData.membros && Array.isArray(this.accountData.membros)) {
                    this.members = this.accountData.membros.map(membroId => ({
                        usuario_id: membroId,
                        nome: 'Membro',
                        is_owner: membroId == this.accountData.usuario_id
                    }));
                } else {
                    this.members = [];
                }
            }
            
            this.renderMembersList();
            
        } catch (error) {
            console.error('❌ Erro ao carregar membros:', error);
            this.members = [];
            this.renderMembersList();
        }
    }

    renderMembersList() {
        const membersList = document.getElementById('membersList');
        if (!membersList) return;
        
        if (this.members.length === 0) {
            membersList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #666;">
                    <p>👤 Ainda não há outros membros nesta conta.</p>
                    <p class="small">Compartilhe o código para convidar pessoas.</p>
                </div>
            `;
            return;
        }
        
        const userId = this.getUserId();
        
        membersList.innerHTML = this.members.map(member => {
            const isCurrentUser = member.usuario_id == userId;
            const isOwner = member.usuario_id == this.accountData.usuario_id;
            const memberName = member.nome || 'Membro';
            const firstLetter = memberName.charAt(0).toUpperCase();
            
            return `
                <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee;">
                    <div style="width: 40px; height: 40px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-right: 15px;">
                        ${firstLetter}
                    </div>
                    <div style="flex: 1;">
                        <strong>${memberName}</strong>
                        <div class="small">
                            ${isOwner ? '👑 Dono' : '👥 Membro'}
                            ${isCurrentUser ? ' (Você)' : ''}
                        </div>
                        ${member.email ? `<div class="small">${member.email}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadCategories() {
        try {
            console.log('🔄 Carregando categorias...');
            
            const userId = this.getUserId();
            if (!userId) {
                console.error('❌ Usuário não autenticado');
                this.categories = [];
                return;
            }
            
            const cats = await app.apiCall('/categorias');
            console.log('📦 Todas categorias da API:', cats);
            
            // Filtrar categorias do usuário atual (mesmo padrão do transacoes.js)
            this.categories = cats.filter(cat => {
                const catUserId = cat.usuario_id ? parseInt(cat.usuario_id) : null;
                const currentUserId = parseInt(userId);
                return catUserId === currentUserId;
            });
            
            console.log(`✅ ${this.categories.length} categorias do usuário carregadas:`, this.categories);
            
        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
            this.categories = [];
        }
    }

    filterCategoriesByType(type) {
        const select = document.getElementById('transactionCategory');
        if (!select) return;
        
        console.log(`🔍 Filtrando categorias por tipo: ${type}`);
        console.log('Categorias disponíveis:', this.categories);
        
        const categoriasFiltradas = this.categories.filter(cat => cat.tipo === type);
        
        console.log(`✅ ${categoriasFiltradas.length} categorias do tipo "${type}"`);
        
        select.innerHTML = categoriasFiltradas.map(cat =>
            `<option value="${cat.id}">${cat.nome}</option>`
        ).join('') || `<option value="">Nenhuma categoria ${type === 'expense' ? 'de despesa' : 'de receita'} disponível</option>`;
    }

    async loadTransactions() {
        try {
            console.log('🔄 Carregando transações...');
            
            // Verificar se a rota existe
            try {
                const transactions = await app.apiCall(`/shared-accounts/${this.accountId}/transactions`);
                
                if (transactions && Array.isArray(transactions)) {
                    this.transactions = transactions;
                    console.log(`✅ ${this.transactions.length} transações carregadas`);
                } else {
                    this.transactions = [];
                    console.log('ℹ️ Nenhuma transação encontrada ou erro na resposta');
                }
            } catch (apiError) {
                console.log('⚠️ Rota de transações não disponível ainda');
                this.transactions = [];
            }
            
            this.renderTransactions();
            this.calculateStats();
            
        } catch (error) {
            console.error('❌ Erro ao carregar transações:', error);
            this.transactions = [];
            this.renderTransactions();
        }
    }

    renderTransactions() {
        const list = document.getElementById('transactionsList');
        const emptyState = document.getElementById('noTransactions');
        
        if (!list || !emptyState) return;
        
        if (this.transactions.length === 0) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Ordenar por data (mais recente primeiro)
        const sortedTransactions = [...this.transactions].sort((a, b) => 
            new Date(b.data) - new Date(a.data)
        );
        
        list.innerHTML = sortedTransactions.map(trans => {
            const isExpense = trans.tipo === 'expense';
            const memberName = trans.usuario_nome || 'Desconhecido';
            const categoriaNome = trans.categoria_nome || 'Sem categoria';
            
            // Encontrar categoria para cor
            const categoria = this.categories.find(c => c.id == trans.categoria_id);
            const isUserTransaction = trans.usuario_id == this.getUserId();
            
            return `
                <tr>
                    <td>${trans.descricao || 'Sem descrição'}</td>
                    <td>
                        <span class="badge ${isExpense ? 'badge-danger' : 'badge-success'}" style="font-size: 12px;">
                            ${isExpense ? '💸 Despesa' : '💰 Receita'}
                        </span>
                    </td>
                    <td>${categoriaNome}</td>
                    <td style="color: ${isExpense ? '#ff4757' : '#2ed573'}; font-weight: bold;">
                        ${isExpense ? '-' : '+'} R$ ${parseFloat(trans.valor).toFixed(2)}
                    </td>
                    <td>${new Date(trans.data).toLocaleDateString('pt-BR')}</td>
                    <td>${memberName} ${isUserTransaction ? '(Você)' : ''}</td>
                    <td>
                        <button onclick="sharedDetails.deleteTransaction(${trans.id})" 
                                class="btn btn-small btn-danger"
                                style="padding: 4px 8px; font-size: 12px;"
                                ${!isUserTransaction ? 'disabled title="Você só pode excluir suas próprias transações"' : ''}>
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    calculateStats() {
        // Calcular total de despesas
        const totalExpenses = this.transactions
            .filter(t => t.tipo === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.valor), 0);
        
        // Calcular total de receitas
        const totalIncomes = this.transactions
            .filter(t => t.tipo === 'income')
            .reduce((sum, t) => sum + parseFloat(t.valor), 0);
        
        // Calcular saldo
        const balance = totalIncomes - totalExpenses;
        
        // Atualizar UI
        const totalExpensesEl = document.getElementById('totalExpenses');
        const totalIncomesEl = document.getElementById('totalIncomes');
        const totalBalanceEl = document.getElementById('totalBalance');
        const balancePerMemberEl = document.getElementById('balancePerMember');
        
        if (totalExpensesEl) {
            totalExpensesEl.textContent = `R$ ${totalExpenses.toFixed(2)}`;
        }
        
        if (totalIncomesEl) {
            totalIncomesEl.textContent = `R$ ${totalIncomes.toFixed(2)}`;
        }
        
        if (totalBalanceEl) {
            totalBalanceEl.textContent = `R$ ${balance.toFixed(2)}`;
            totalBalanceEl.style.color = balance >= 0 ? '#2ed573' : '#ff4757';
        }
        
        // Calcular saldo por membro
        const membersCount = this.accountData.membersCount || this.members.length || 1;
        const balancePerMember = balance / membersCount;
        
        if (balancePerMemberEl) {
            balancePerMemberEl.textContent = `R$ ${balancePerMember.toFixed(2)}`;
            balancePerMemberEl.style.color = balancePerMember >= 0 ? '#2ed573' : '#ff4757';
        }
    }

    async addTransaction() {
        const descricao = document.getElementById('transactionDesc').value;
        const tipo = document.getElementById('transactionType').value;
        const valorInput = document.getElementById('transactionAmount').value;
        const data = document.getElementById('transactionDate').value;
        const categoria_id = document.getElementById('transactionCategory').value;
        
        // Validações
        if (!descricao || !tipo || !valorInput || !data || !categoria_id) {
            Utils.showMessage('❌ Preencha todos os campos obrigatórios', 'error');
            return;
        }
        
        const valor = parseFloat(valorInput);
        if (isNaN(valor) || valor <= 0) {
            Utils.showMessage('❌ Digite um valor válido maior que zero', 'error');
            return;
        }
        
        const formData = {
            descricao: descricao,
            tipo: tipo,
            valor: valor,
            data: data,
            categoria_id: parseInt(categoria_id)
        };
        
        console.log('📤 Enviando transação:', formData);
        
        Utils.showLoading();
        try {
            const result = await app.apiCall(`/shared-accounts/${this.accountId}/transactions`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            // Resetar formulário
            document.getElementById('addTransactionForm').reset();
            this.setCurrentDate();
            
            // Mostrar mensagem de sucesso
            Utils.showMessage('✅ Transação adicionada com sucesso!', 'success');
            
            // Voltar para aba de transações e recarregar
            this.showTab('transactions');
            
        } catch (error) {
            console.error('Erro ao adicionar transação:', error);
            Utils.showMessage('❌ Erro ao adicionar transação: ' + (error.message || 'Verifique o console'), 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async deleteTransaction(transactionId) {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
        
        Utils.showLoading();
        try {
            await app.apiCall(`/shared-accounts/${this.accountId}/transactions/${transactionId}`, {
                method: 'DELETE'
            });
            
            // Recarregar transações
            await this.loadTransactions();
            
            Utils.showMessage('✅ Transação excluída com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            Utils.showMessage('❌ Erro ao excluir transação: ' + (error.message || 'Verifique o console'), 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    copyInviteLink() {
        const inviteLink = document.getElementById('inviteLink');
        if (!inviteLink) return;
        
        inviteLink.select();
        inviteLink.setSelectionRange(0, 99999); // Para mobile
        
        try {
            navigator.clipboard.writeText(inviteLink.value).then(() => {
                Utils.showMessage('📋 Link copiado para a área de transferência!', 'success');
            }).catch(() => {
                // Fallback para navegadores antigos
                document.execCommand('copy');
                Utils.showMessage('📋 Link copiado para a área de transferência!', 'success');
            });
        } catch (error) {
            console.error('Erro ao copiar:', error);
            Utils.showMessage('❌ Erro ao copiar link', 'error');
        }
    }

    cancelTransaction() {
        const form = document.getElementById('addTransactionForm');
        if (form) {
            form.reset();
            this.setCurrentDate();
            this.filterCategoriesByType('expense');
            Utils.showMessage('Formulário limpo', 'info');
        }
    }

    // Método auxiliar para debug
    debugCategories() {
        console.log('=== DEBUG CATEGORIAS ===');
        console.log('Categorias carregadas:', this.categories);
        console.log('Quantidade:', this.categories.length);
        
        if (this.categories.length > 0) {
            console.log('Primeira categoria:', this.categories[0]);
            console.log('Campos:', Object.keys(this.categories[0]));
        }
        
        const userId = this.getUserId();
        console.log('ID do usuário atual:', userId);
        console.log('Tipo do ID:', typeof userId);
        
        // Testar filtro
        const userCats = this.categories.filter(cat => {
            const catUserId = cat.usuario_id ? parseInt(cat.usuario_id) : null;
            const currentUserId = parseInt(userId);
            return catUserId === currentUserId;
        });
        
        console.log('Categorias filtradas para usuário:', userCats.length);
    }
}

// Inicialização
let sharedDetails;
document.addEventListener('DOMContentLoaded', function () {
    sharedDetails = new SharedDetailsManager();
    window.sharedDetails = sharedDetails;
    
    // Adicionar atalho para debug
    window.debugSharedDetails = function() {
        console.log('=== DEBUG SHARED DETAILS ===');
        console.log('Account ID:', sharedDetails.accountId);
        console.log('Account Data:', sharedDetails.accountData);
        console.log('Categories:', sharedDetails.categories);
        console.log('Transactions:', sharedDetails.transactions);
        console.log('Members:', sharedDetails.members);
        console.log('User ID:', sharedDetails.getUserId());
        
        // Testar API de categorias
        app.apiCall('/categorias').then(cats => {
            console.log('API Categorias:', cats);
            const userId = sharedDetails.getUserId();
            const userCats = cats.filter(cat => cat.usuario_id == userId);
            console.log('Categorias do usuário da API:', userCats);
        });
    };
});