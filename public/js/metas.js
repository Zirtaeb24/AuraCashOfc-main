// metas.js CORRIGIDO
class MetasManager {
    constructor() {
        this.form = document.getElementById('goalForm');
        this.list = document.getElementById('goalList');
        this.init();
    }

    async init() {
        this.setupForm();
        await this.loadMetas();
        await this.loadCategorias();
    }

    setupForm() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveMeta();
        });
    }

    async loadCategorias() {
        try {
            const categorias = await app.apiCall('/categorias', { method: 'GET' });
            const select = document.getElementById('goalCategory');
            
            select.innerHTML = categorias.map(cat => 
                `<option value="${cat.id}">${cat.nome}</option>`
            ).join('');
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    async saveMeta() {
        const formData = new FormData(this.form);
        const meta = {
            categoryId: parseInt(formData.get('categoryId')),
            amount: parseFloat(formData.get('amount')),
            from: formData.get('from'),
            to: formData.get('to')
        };

        try {
            await app.apiCall('/metas', {
                method: 'POST',
                body: JSON.stringify(meta)
            });

            this.form.reset();
            await this.loadMetas();
            Utils.showMessage('Meta salva com sucesso!', 'success');
        } catch (error) {
            Utils.showMessage('Erro ao salvar meta', 'error');
        }
    }

    async loadMetas() {
        try {
            const metas = await app.apiCall('/metas', { method: 'GET' });
            this.renderMetas(metas);
        } catch (error) {
            console.error('Erro ao carregar metas:', error);
        }
    }

    async renderMetas(metas) {
    
        let html = '';
    
        for (const meta of metas) {
            const progresso = await this.calculateProgress(meta);
    
            html += `
                <div class="card" style="margin: 10px 0; padding: 15px;">
                    <h4>${meta.categoria_nome}</h4>
                    <p><strong>Meta:</strong> ${Utils.formatCurrency(meta.valor)}</p>
                    <p><strong>Período:</strong> ${Utils.formatDate(meta.data_inicio)} até ${Utils.formatDate(meta.data_fim)}</p>
    
                    <div class="progress">
                        <div style="width: ${progresso}%"></div>
                    </div>
                </div>
            `;
        }
    
        this.list.innerHTML = html;
    }


    async calculateProgress(meta) {

        const transacoes = await app.apiCall(`/transacoes/categoria/${meta.categoryId}`, {
            method: 'GET'
        });
    
        const total = transacoes.reduce((soma, t) => soma + t.valor, 0);
    
        let progresso = (total / meta.valor) * 100;
    
        return Math.min(progresso, 100);
    }

    async deleteMeta(id) {
        if (confirm('Tem certeza que deseja excluir esta meta?')) {
            try {
                await app.apiCall(`/metas/${id}`, { method: 'DELETE' });
                await this.loadMetas();
                Utils.showMessage('Meta excluída!', 'success');
            } catch (error) {
                Utils.showMessage('Erro ao excluir meta', 'error');
            }
        }
    }
}

let metasManager;
if (document.getElementById('goalForm')) {
    metasManager = new MetasManager();
}
