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
        try {
            // Buscar todas as transações
            const transacoes = await this.apiCall('/transacoes', { method: 'GET' });
            
            // Filtrar transações da categoria e período
            const transacoesFiltradas = transacoes.filter(transacao => {
                // Verificar se existe data na transação
                if (!transacao.data) return false;
                
                const dataTransacao = new Date(transacao.data);
                const dataInicio = new Date(meta.data_inicio);
                const dataFim = new Date(meta.data_fim);
                
                // Ajustar para considerar todo o dia
                dataInicio.setHours(0, 0, 0, 0);
                dataFim.setHours(23, 59, 59, 999);
                dataTransacao.setHours(12, 0, 0, 0);
                
                const mesmaCategoria = transacao.categoria_id == meta.categoria_id;
                const dentroDoPeriodo = dataTransacao >= dataInicio && dataTransacao <= dataFim;
                
                return mesmaCategoria && dentroDoPeriodo;
            });
            
            // Calcular total (considera que valores negativos são despesas)
            let totalGasto = 0;
            transacoesFiltradas.forEach(transacao => {
                // Se for despesa (negativo), converte para positivo para somar
                if (transacao.valor < 0) {
                    totalGasto += Math.abs(transacao.valor);
                }
            });
            
            // Calcular progresso
            let progresso = 0;
            if (meta.valor > 0) {
                progresso = (totalGasto / meta.valor) * 100;
            }
            
            // Arredondar e garantir limites
            progresso = Math.round(progresso * 10) / 10; // 1 casa decimal
            progresso = Math.min(progresso, 100); // Máximo 100%
            
            return progresso;
            
        } catch (error) {
            console.error('Erro ao calcular progresso:', error);
            return 0;
        }
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
