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

    renderMetas(metas) {
        this.list.innerHTML = metas.map(meta => `
            <div class="card" style="margin: 10px 0; padding: 15px;">
                <h4>${meta.categoria_nome || 'Categoria não definida'}</h4>
                <p><strong>Meta:</strong> ${Utils.formatCurrency(meta.valor)}</p>
                <p><strong>Período:</strong> ${Utils.formatDate(meta.data_inicio)} até ${Utils.formatDate(meta.data_fim)}</p>
                <div class="progress">
                    <div style="width: ${this.calculateProgress(meta)}%"></div>
                </div>
                <button onclick="metasManager.deleteMeta(${meta.id})" class="btn btn-danger">Excluir</button>
            </div>
        `).join('') || '<div class="small">Nenhuma meta cadastrada.</div>';
    }

    async calculateProgress(meta) {
        // Garantir que categoryId exista
        const categoriaId = meta.categoryId || meta.categoria_id;
    
        if (!categoriaId) {
            console.warn("Meta sem categoriaId:", meta);
            return 0;
        }
    
        let transacoes = [];
    
        try {
            transacoes = await app.apiCall(`/transacoes/categoria/${categoriaId}`, { method: "GET" });
    
            if (!Array.isArray(transacoes)) {
                transacoes = [];
            }
    
        } catch (error) {
            console.warn("Erro ao carregar transações da categoria:", error);
            transacoes = [];
        }
    
        // Somar valores da categoria no período
        const total = transacoes.reduce((acc, t) => acc + Number(t.valor || 0), 0);
    
        // Calcular % da meta atingida
        const progresso = (total / meta.amount) * 100;
    
        // Proteger contra valores acima de 100%
        return Math.min(100, Math.max(0, progresso));
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
