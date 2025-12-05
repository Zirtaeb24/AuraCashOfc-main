// js/compartilhada.js - VERSÃO ATUALIZADA
class CompartilhadaManager {
    constructor() {
        this.newSharedForm = document.getElementById('newShared');
        this.joinSharedForm = document.getElementById('joinShared');
        this.list = document.getElementById('list');
        this.init();
    }

    async init() {
        console.log('👥 Inicializando contas compartilhadas...');
        this.setupForms();
        await this.loadSharedAccounts();
        this.checkUrlParams(); // Verificar se há parâmetros na URL
    }

    setupForms() {
        if (this.newSharedForm) {
            this.newSharedForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createSharedAccount();
            });
        }

        if (this.joinSharedForm) {
            this.joinSharedForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.joinSharedAccount();
            });
        }
    }

    // NOVO MÉTODO: Verificar parâmetros da URL
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const joinCode = urlParams.get('join');

        if (joinCode) {
            console.log('🔗 Código de convite encontrado na URL:', joinCode);
            // Preencher automaticamente o formulário
            const sharedIdInput = document.getElementById('sharedId');
            if (sharedIdInput) {
                sharedIdInput.value = joinCode;
                Utils.showMessage(`Código de convite detectado! Clique em "Entrar" para participar.`, 'info');
            }
        }
    }

    async createSharedAccount() {
        const formData = new FormData(this.newSharedForm);
        const name = formData.get('name')?.toString().trim();

        if (!name) {
            Utils.showMessage('❌ Digite um nome para a conta', 'error');
            return;
        }

        Utils.showLoading();
        try {
            const resultado = await app.apiCall('/shared-accounts', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            console.log('✅ Conta criada:', resultado);
            this.newSharedForm.reset();
            await this.loadSharedAccounts();
            Utils.showMessage('✅ Conta compartilhada criada! Compartilhe o ID: ' + resultado.codigo, 'success');
        } catch (error) {
            console.error('❌ Erro ao criar conta:', error);
            Utils.showMessage('❌ Erro ao criar conta compartilhada', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async joinSharedAccount() {
        const formData = new FormData(this.joinSharedForm);
        const sharedId = formData.get('id')?.toString().trim();

        if (!sharedId) {
            Utils.showMessage('❌ Digite o ID da conta', 'error');
            return;
        }

        Utils.showLoading();
        try {
            const resultado = await app.apiCall(`/shared-accounts/${sharedId}/join`, {
                method: 'POST'
            });

            console.log('✅ Entrou na conta:', resultado);
            this.joinSharedForm.reset();
            await this.loadSharedAccounts();

            // Limpar parâmetro da URL se estava entrando via link
            if (window.history.replaceState) {
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }

            // ✅ CORREÇÃO: Verificar se resultado tem 'conta.nome' ou apenas 'message'
            const mensagem = resultado.conta?.nome ? 
                `✅ Entrou na conta compartilhada: ${resultado.conta.nome}` :
                `✅ ${resultado.message || 'Entrou na conta compartilhada com sucesso!'}`;
            
            Utils.showMessage(mensagem, 'success');
        } catch (error) {
            console.error('❌ Erro ao entrar na conta:', error);
            Utils.showMessage('❌ ' + (error.message || 'Erro ao entrar na conta compartilhada'), 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async loadSharedAccounts() {
        try {
            console.log('🔄 Carregando contas compartilhadas...');
            const accounts = await app.apiCall('/shared-accounts', { method: 'GET' });
            console.log('Contas carregadas:', accounts);
            this.renderSharedAccounts(accounts);
        } catch (error) {
            console.error('❌ Erro ao carregar contas:', error);
            this.renderSharedAccounts([]);
        }
    }

    async leaveSharedAccount(accountId, accountName) {
        const confirmar = confirm(`Tem certeza que deseja sair da conta "${accountName}"?`);

        if (!confirmar) return;

        Utils.showLoading();
        try {
            const resultado = await app.apiCall(`/shared-accounts/${accountId}/leave`, {
                method: 'POST'
            });

            console.log('✅ Saiu da conta:', resultado);
            await this.loadSharedAccounts();
            Utils.showMessage('✅ ' + resultado.message, 'success');
        } catch (error) {
            console.error('❌ Erro ao sair da conta:', error);
            Utils.showMessage('❌ ' + (error.message || 'Erro ao sair da conta compartilhada'), 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async deleteSharedAccount(accountId, accountName) {
        const confirmar = confirm(`ATENÇÃO: Tem certeza que deseja DELETAR permanentemente a conta "${accountName}"? Esta ação não pode ser desfeita e todos os membros perderão acesso.`);

        if (!confirmar) return;

        Utils.showLoading();
        try {
            const resultado = await app.apiCall(`/shared-accounts/${accountId}`, {
                method: 'DELETE'
            });

            console.log('✅ Conta deletada:', resultado);
            await this.loadSharedAccounts();
            Utils.showMessage('✅ ' + resultado.message, 'success');
        } catch (error) {
            console.error('❌ Erro ao deletar conta:', error);
            Utils.showMessage('❌ ' + (error.message || 'Erro ao deletar conta compartilhada'), 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    renderSharedAccounts(accounts) {
        if (!accounts || accounts.length === 0) {
            this.list.innerHTML = `
            <div class="small" style="text-align: center; padding: 30px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 10px;">👥</div>
                <p>Você não participa de nenhuma conta compartilhada.</p>
                <small>Crie uma nova conta ou entre em uma existente.</small>
            </div>
        `;

            return;
        }

        this.list.innerHTML = accounts.map(account => {
            // ✅ CORREÇÃO: Verificar se membros é array ou string
            let membrosTexto = 'Nenhum membro adicional';
            if (account.membros) {
                if (Array.isArray(account.membros)) {
                    if (account.membros.length > 0) {
                        membrosTexto = account.membros.map(m => 
                            typeof m === 'object' ? (m.nome || 'Membro') : m
                        ).join(', ');
                    }
                } else if (typeof account.membros === 'string') {
                    membrosTexto = account.membros;
                }
            }

            const dono = account.dono || account.usuario_nome || 'Desconhecido';
            const membersCount = account.membersCount || (account.membros && Array.isArray(account.membros) ? account.membros.length : 1);

            return `
            <div class="card" style="margin: 10px 0; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <strong style="font-size: 18px;">${account.nome}</strong> 
                        <div class="small" style="margin-top: 5px;">
                            <strong>ID:</strong> ${account.codigo}
                        </div>
                    </div>
                    <div class="badge" style="background: var(--primary); color: white;">
                        👥 ${membersCount} membro(s)
                    </div>
                </div>

                <div style="margin-top: 10px;">
                    <strong>Dono:</strong> ${dono}
                </div>
                <div style="margin-top: 5px;">
                    <strong>Membros:</strong> ${membrosTexto}
                </div>

                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button onclick="compartilhadaManager.openAccount('${account.id}', '${account.codigo}')" class="btn btn-primary">
                        🔓 Abrir Conta
                    </button>
                    <button onclick="compartilhadaManager.shareLink('${account.codigo}')" class="btn btn-accent">
                        📤 Compartilhar
                    </button>
                    <button onclick="compartilhadaManager.leaveSharedAccount('${account.id}', '${account.nome}')" class="btn btn-warning">
                        🚪 Sair
                    </button>
                    <button onclick="compartilhadaManager.deleteSharedAccount('${account.id}', '${account.nome}')" class="btn btn-danger">
                        🗑️ Deletar
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    openAccount(accountId, accountCode) {
        console.log(`🔓 Abrindo conta ${accountId}...`);

        // Redirecionar para a tela de detalhes
        window.location.href = `shared-details.html?id=${accountId}`;
    }

    shareLink(accountCode) {
        const link = `${window.location.origin}${window.location.pathname}?join=${accountCode}`;

        // Copiar para área de transferência
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => {
                Utils.showMessage('📋 Link copiado! Compartilhe com seus amigos.', 'success');
            }).catch(() => {
                this.fallbackCopy(link);
            });
        } else {
            this.fallbackCopy(link);
        }
    }

    fallbackCopy(link) {
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        Utils.showMessage('📋 Link copiado! Compartilhe com seus amigos.', 'success');
    }
}

// Inicialização
let compartilhadaManager;
if (document.getElementById('newShared')) {
    document.addEventListener('DOMContentLoaded', function () {
        compartilhadaManager = new CompartilhadaManager();
    });
}
