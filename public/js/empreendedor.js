// js/empreendedor.js - VERSÃO CORRIGIDA COM API
class EmpreendedorManager {
    constructor() {
        this.matForm = document.getElementById('matForm');
        this.matTable = document.getElementById('matTable');
        this.prodForm = document.getElementById('prodForm');
        this.matUses = document.getElementById('matUses');
        this.materiais = [];
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando módulo empreendedor...');
        this.setupForms();
        await this.loadMateriais();
        this.addMaterialUseRow();
    }

    setupForms() {
        if (this.matForm) {
            this.matForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveMaterial();
            });
        }

        if (this.prodForm) {
            this.prodForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.calcularCusto();
            });
        }

        const addUseBtn = document.getElementById('addUse');
        if (addUseBtn) {
            addUseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addMaterialUseRow();
            });
        }
    }

    addMaterialUseRow() {
        const row = document.createElement('div');
        row.className = 'useRow';
        row.style.cssText = `
            display: flex;
            gap: 10px;
            margin: 8px 0;
            align-items: center;
            padding: 8px;
            background: #f9f9f9;
            border-radius: 8px;
        `;

        row.innerHTML = `
            <select name="materialId" required style="flex: 2;">
                <option value="">Selecione o material</option>
            </select>
            <input type="number" name="qtyUsed" step="0.0001" placeholder="Quantidade usada" required 
                   style="flex: 1; padding: 8px;" min="0.0001">
            <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" 
                    style="padding: 8px 12px;">🗑️</button>
        `;
        this.matUses.appendChild(row);
        this.loadMateriaisIntoSelect(row.querySelector('select'));
    }

    async loadMateriais() {
        try {
            // ✅ USANDO API (filtrando por usuário logado)
            this.materiais = await app.apiCall('/api/materiais', { method: 'GET' });
            console.log('✅ Materiais carregados:', this.materiais);
            this.renderMateriais();
        } catch (error) {
            console.error('Erro ao carregar materiais:', error);
            this.materiais = [];
            this.renderMateriais();
        }
    }

    loadMateriaisIntoSelect(select) {
        if (!select) return;
        if (!this.materiais.length) {
            select.innerHTML = `<option value="">⚠️ Nenhum material cadastrado</option>`;
            return;
        }
        select.innerHTML = `
            <option value="">Selecione o material</option>
            ${this.materiais.map(m => `<option value="${m.id}">${m.nome} - R$ ${m.valor_total.toFixed(2)}</option>`).join('')}
        `;
    }

    renderMateriais() {
        const tbody = this.matTable.querySelector('tbody');
        if (!this.materiais.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="small" style="text-align:center;">Nenhum material cadastrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.materiais.map(m => {
            const custoUnit = m.quantidade > 0 ? m.valor_total / m.quantidade : 0;
            return `
                <tr>
                    <td>${m.nome}</td>
                    <td>R$ ${m.valor_total.toFixed(2)}</td>
                    <td>${m.quantidade.toFixed(4)}</td>
                    <td>R$ ${custoUnit.toFixed(4)}</td>
                </tr>
            `;
        }).join('');
    }

    async saveMaterial() {
        const name = document.getElementById('materialName').value.trim();
        const totalValue = parseFloat(document.getElementById('materialValue').value);
        const qty = parseFloat(document.getElementById('materialQty').value);

        if (!name || totalValue <= 0 || qty <= 0) {
            alert('Preencha todos os campos corretamente!');
            return;
        }

        Utils.showLoading();
        try {
            // ✅ SALVANDO VIA API (usuário específico)
            const resultado = await app.apiCall('/api/materiais', {
                method: 'POST',
                body: JSON.stringify({
                    nome: name,
                    valor_total: totalValue,
                    quantidade: qty
                })
            });

            console.log('✅ Material salvo no banco:', resultado);
            await this.loadMateriais(); // Recarrega da API
            this.updateAllSelects();
            this.matForm.reset();
            Utils.showMessage('✅ Material salvo com sucesso!', 'success');
        } catch (error) {
            console.error('❌ Erro ao salvar material:', error);
            Utils.showMessage('❌ Erro ao salvar material', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    updateAllSelects() {
        const selects = this.matUses.querySelectorAll('select[name="materialId"]');
        selects.forEach(sel => this.loadMateriaisIntoSelect(sel));
    }

    async calcularCusto() {
        const productName = document.getElementById('productName').value.trim();
        if (!productName) {
            alert('Digite o nome do produto!');
            return;
        }

        const materialUses = Array.from(this.matUses.querySelectorAll('.useRow'))
            .map(row => {
                const materialId = row.querySelector('select')?.value;
                const qtyUsed = parseFloat(row.querySelector('input')?.value);
                if (!materialId || qtyUsed <= 0) return null;
                return { material_id: parseInt(materialId), quantidade_usada: qtyUsed };
            })
            .filter(x => x !== null);

        if (!materialUses.length) {
            alert('Adicione pelo menos um material válido.');
            return;
        }

        Utils.showLoading();
        try {
            // ✅ CALCULANDO VIA API
            const resultado = await app.apiCall('/api/calcular-custo', {
                method: 'POST',
                body: JSON.stringify({
                    nome_produto: productName,
                    materiais: materialUses
                })
            });

            console.log('✅ Custo calculado:', resultado);

            const resultDiv = document.getElementById('result');
            const resultContent = document.getElementById('resultContent');
            
            let detalhesHTML = '';
            if (resultado.detalhes && resultado.detalhes.length > 0) {
                detalhesHTML = '<ul>' + resultado.detalhes.map(d => 
                    `<li>${d.nome}: R$ ${d.custo_unitario.toFixed(4)} × ${d.quantidade_usada} = R$ ${d.custo_total.toFixed(2)}</li>`
                ).join('') + '</ul>';
            }

            resultContent.innerHTML = `
                <p><strong>Produto:</strong> ${resultado.produto}</p>
                <p><strong>Custo Total:</strong> R$ ${resultado.custo_total.toFixed(2)}</p>
                ${detalhesHTML}
            `;
            resultDiv.style.display = 'block';
            
            Utils.showMessage('✅ Custo calculado com sucesso!', 'success');
        } catch (error) {
            console.error('❌ Erro ao calcular custo:', error);
            Utils.showMessage('❌ Erro ao calcular custo', 'error');
        } finally {
            Utils.hideLoading();
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => new EmpreendedorManager());
