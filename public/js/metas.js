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

    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        try {
            const response = await fetch(endpoint, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            
            return response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }

    async loadCategorias() {
        try {
            const categorias = await this.apiCall('/categorias', { method: 'GET' });
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
            await this.apiCall('/metas', {
                method: 'POST',
                body: JSON.stringify(meta)
            });

            this.form.reset();
            await this.loadMetas();
            this.showMessage('Meta salva com sucesso!', 'success');
        } catch (error) {
            console.error('Erro detalhado:', error);
            this.showMessage('Erro ao salvar meta', 'error');
        }
    }

    async loadMetas() {
        try {
            const metas = await this.apiCall('/metas', { method: 'GET' });
            await this.renderMetas(metas);
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
                    <h4>${meta.categoria_nome || 'Categoria não definida'}</h4>
                    <p><strong>Meta:</strong> ${this.formatCurrency(meta.valor)}</p>
                    <p><strong>Período:</strong> ${this.formatDate(meta.data_inicio)} até ${this.formatDate(meta.data_fim)}</p>
                    <div class="progress" style="height: 25px; margin: 10px 0; border-radius: 5px; overflow: hidden;">
                        <div class="progress-bar" 
                             role="progressbar" 
                             style="width: ${progresso}%; 
                                    background-color: ${progresso > 100 ? '#dc3545' : (progresso > 80 ? '#ffc107' : '#28a745')};
                                    color: ${progresso > 50 ? 'white' : 'black'};
                                    text-align: center;
                                    line-height: 25px;
                                    font-weight: bold;"
                             aria-valuenow="${progresso}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${progresso.toFixed(1)}%
                        </div>
                    </div>
                    <button onclick="metasManager.deleteMeta(${meta.id})" class="btn btn-danger">Excluir</button>
                </div>
            `;
        }
        
        this.list.innerHTML = html || '<div class="small">Nenhuma meta cadastrada.</div>';
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
                await this.apiCall(`/metas/${id}`, { method: 'DELETE' });
                await this.loadMetas();
                this.showMessage('Meta excluída!', 'success');
            } catch (error) {
                this.showMessage('Erro ao excluir meta', 'error');
            }
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    }

    formatDate(dateString) {
        if (!dateString) return 'Data inválida';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateString;
        }
    }

    showMessage(message, type = 'info') {
        // Implementação simples
        const types = {
            success: 'Sucesso',
            error: 'Erro',
            info: 'Informação'
        };
        
        alert(`${types[type] || 'Info'}: ${message}`);
    }
}

let metasManager;
if (document.getElementById('goalForm')) {
    metasManager = new MetasManager();
}
