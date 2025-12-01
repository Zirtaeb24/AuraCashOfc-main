// js/relatorios.js - VERSÃO FINAL COMPLETA E FUNCIONAL
class RelatoriosManager {
    constructor() {
        this.form = document.querySelector('form');
        this.pieChart = document.getElementById('pieChart');
        this.barChart = document.getElementById('barChart');
        this.init();
    }

    async init() {
        console.log('📊 Inicializando módulo de relatórios...');
        this.setupForm();
        await this.loadRelatorios();
    }

    setupForm() {
        if (!this.form) return;

        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.loadRelatorios();
        });
    }

    async loadRelatorios() {
        try {
            console.log('🔄 Carregando dados para relatórios...');
            const [transacoes, categorias] = await Promise.all([
                app.apiCall('/transacoes', { method: 'GET' }),
                app.apiCall('/categorias', { method: 'GET' })
            ]);

            console.log('📈 Transações carregadas:', transacoes);
            console.log('📂 Categorias carregadas:', categorias);

            if (!transacoes || transacoes.length === 0) {
                this.showNoDataMessage();
                return;
            }

            this.renderPieChart(transacoes, categorias);
            this.renderBarChart(transacoes);
        } catch (error) {
            console.error('❌ Erro ao carregar relatórios:', error);
            this.showErrorMessage();
        }
    }

    showNoDataMessage() {
        const html = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                <h3>Nenhum dado disponível</h3>
                <p>Adicione algumas transações para ver os relatórios.</p>
                <a href="transacoes.html" class="btn btn-primary" style="margin-top: 15px;">
                    ➕ Adicionar Transação
                </a>
            </div>
        `;
        this.pieChart.innerHTML = html;
        this.barChart.innerHTML = html;
    }

    showErrorMessage() {
        const html = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <div style="font-size: 36px; margin-bottom: 10px;">❌</div>
                <p>Erro ao carregar relatórios</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 10px;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
        this.pieChart.innerHTML = html;
        this.barChart.innerHTML = html;
    }

    renderPieChart(transacoes, categorias) {
        console.log('🎨 Renderizando gráfico de pizza...');
        try {
            const despesas = transacoes.filter(t => (t.tipo || t.type) === 'expense');

            if (despesas.length === 0) {
                this.pieChart.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #666;">
                        <div style="font-size: 36px; margin-bottom: 10px;">💸</div>
                        <p>Nenhuma despesa encontrada</p>
                        <small>Adicione despesas para ver o gráfico</small>
                    </div>
                `;
                return;
            }

            const gastosPorCategoria = {};
            despesas.forEach(despesa => {
                const categoriaId = despesa.categoria_id || despesa.categoryId;
                const categoria = categorias.find(c => c.id === categoriaId);
                const nomeCategoria = categoria ? (categoria.nome || categoria.name) : 'Sem Categoria';
                const valor = Utils.toSafeNumber(despesa.valor || despesa.amount);
                gastosPorCategoria[nomeCategoria] = (gastosPorCategoria[nomeCategoria] || 0) + valor;
            });

            const cores = ['#f39a05', '#8450a7', '#7a86ff', '#28a745', '#dc3545', '#ffc107', '#17a2b8'];
            const totalDespesas = Object.values(gastosPorCategoria).reduce((sum, val) => sum + val, 0);

            this.pieChart.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h4>📊 Despesas por Categoria</h4>
                    <small style="color: #666;">Total: ${Utils.formatCurrency(totalDespesas)}</small>
                </div>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; margin-bottom: 20px;">
                    ${Object.entries(gastosPorCategoria).map(([categoria, total], index) => {
                        const percentual = ((total / totalDespesas) * 100).toFixed(1);
                        return `
                            <div style="text-align: center; min-width: 120px;">
                                <div style="width: 50px; height: 50px; background: ${cores[index % cores.length]};
                                    border-radius: 50%; display: inline-block; margin-bottom: 8px;"></div>
                                <div style="font-weight: bold; font-size: 14px;">${categoria}</div>
                                <div style="font-size: 13px; color: #666;">${Utils.formatCurrency(total)}</div>
                                <div style="font-size: 12px; color: #999; font-weight: bold;">${percentual}%</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } catch (error) {
            console.error('❌ Erro ao renderizar gráfico de pizza:', error);
            this.pieChart.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc3545;">❌ Erro ao gerar gráfico</div>`;
        }
    }

    renderBarChart(transacoes) {
        console.log('📈 Renderizando gráfico de barras...');
        try {
            const semanas = this.agruparPorSemanas(transacoes);
            const semanasComDados = semanas.filter(s => s.receitas > 0 || s.despesas > 0);

            if (semanasComDados.length === 0) {
                this.barChart.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #666;">
                        <div style="font-size: 36px; margin-bottom: 10px;">📅</div>
                        <p>Nenhuma transação para exibir</p>
                        <small>Adicione transações para ver o gráfico</small>
                    </div>
                `;
                return;
            }

            const maxValor = Math.max(...semanasComDados.map(s => Math.max(s.receitas, s.despesas)), 100);

            this.barChart.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h4>📈 Receitas vs Despesas (Últimas 4 semanas)</h4>
                </div>
                <div style="display: flex; align-items: end; justify-content: center; gap: 12px; 
                    height: 200px; border-bottom: 2px solid #ddd; padding: 0 10px; margin-bottom: 20px;">
                    ${semanasComDados.map((semana) => {
                        const alturaReceitas = (semana.receitas / maxValor) * 150;
                        const alturaDespesas = (semana.despesas / maxValor) * 150;
                        return `
                            <div style="text-align: center; flex: 1;">
                                <div style="display: flex; align-items: end; justify-content: center; 
                                    height: 150px; gap: 4px; margin-bottom: 8px;">
                                    <div style="background: #28a745; width: 20px; height: ${alturaReceitas}px; 
                                        border-radius: 4px 4px 0 0;" 
                                        title="Receitas: ${Utils.formatCurrency(semana.receitas)}"></div>
                                    <div style="background: #dc3545; width: 20px; height: ${alturaDespesas}px; 
                                        border-radius: 4px 4px 0 0;" 
                                        title="Despesas: ${Utils.formatCurrency(semana.despesas)}"></div>
                                </div>
                                <div style="font-size: 11px; font-weight: bold; transform: rotate(-45deg); 
                                    transform-origin: left top; white-space: nowrap;">
                                    ${semana.label}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="display: flex; justify-content: center; gap: 20px; font-size: 12px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="background: #28a745; width: 12px; height: 12px; border-radius: 2px;"></span>
                        <span>Receitas</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="background: #dc3545; width: 12px; height: 12px; border-radius: 2px;"></span>
                        <span>Despesas</span>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ Erro ao renderizar gráfico de barras:', error);
            this.barChart.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc3545;">❌ Erro ao gerar gráfico</div>`;
        }
    }

    agruparPorSemanas(transacoes) {
        const semanas = [];
        const hoje = new Date();

        // Criar últimas 4 semanas
        for (let i = 3; i >= 0; i--) {
            const semanaInicio = new Date(hoje);
            semanaInicio.setDate(hoje.getDate() - (i * 7));
            const semanaNum = this.getSemanaDoAno(semanaInicio);
            semanas.push({ receitas: 0, despesas: 0, label: `S${semanaNum}`, data: new Date(semanaInicio) });
        }

        // Preencher com dados reais
        transacoes.forEach(transacao => {
            try {
                const dataTransacao = new Date(transacao.data || transacao.date);
                const semanaTransacao = this.getSemanaDoAno(dataTransacao);
                const semana = semanas.find(s => s.label === `S${semanaTransacao}`);
                if (!semana) return;

                const tipo = transacao.tipo || transacao.type;
                const valor = Utils.toSafeNumber(transacao.valor || transacao.amount);
                if (tipo === 'income') semana.receitas += valor;
                else if (tipo === 'expense') semana.despesas += valor;
            } catch (error) {
                console.warn('⚠️ Erro ao processar transação:', transacao);
            }
        });

        return semanas;
    }

    getSemanaDoAno(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    exportarRelatorio() {
        const relatorioHTML = `
            <h2>Relatório Financeiro - ${new Date().toLocaleDateString('pt-BR')}</h2>
            ${this.pieChart.innerHTML}
            ${this.barChart.innerHTML}
        `;

        const blob = new Blob([relatorioHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        URL.revokeObjectURL(url);

        Utils.showMessage('📊 Relatório exportado com sucesso!', 'success');
    }
}

// Inicialização segura e única
if (document.getElementById('pieChart')) {
    document.addEventListener('DOMContentLoaded', function () {
        const relatoriosManager = new RelatoriosManager();

        // Botão de exportação
        const exportButton = document.createElement('button');
        exportButton.textContent = '📊 Exportar Relatório';
        exportButton.className = 'btn btn-primary';
        exportButton.style.margin = '10px 0';
        exportButton.onclick = () => relatoriosManager.exportarRelatorio();

        const primeiroCard = document.querySelector('.card');
        if (primeiroCard) primeiroCard.parentNode.insertBefore(exportButton, primeiroCard);
    });
}
