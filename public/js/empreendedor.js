// js/empreendedor.js - VERSÃO 100% CORRIGIDA

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
            this.materiais = await app.apiCall('/materiais', { method: 'GET' });
            console.log('✅ Materiais carregados (RAW):', this.materiais);
            
            // ✅ CONVERTE valores para número com segurança
            this.materiais = this.materiais.map(m => ({
                ...m,
                valor_total: this.parseValue(m.valor_total),
                quantidade: this.parseValue(m.quantidade)
            }));
            
            console.log('✅ Materiais convertidos:', this.materiais);
            this.renderMateriais();
        } catch (error) {
            console.error('Erro ao carregar materiais:', error);
            this.materiais = [];
            this.renderMateriais();
        }
    }

    // ✅ FUNÇÃO PARA CONVERTER VALORES COM SEGURANÇA
    parseValue(value) {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            // Remove R$, pontos, converte vírgula para ponto
            const cleaned = value.toString()
                .replace('R$', '')
                .replace(/\./g, '')
                .replace(',', '.')
                .trim();
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
        }
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    loadMateriaisIntoSelect(select) {
        if (!select) return;
        if (!this.materiais || !this.materiais.length) {
            select.innerHTML = `<option value="">⚠️ Nenhum material cadastrado</option>`;
            return;
        }
        select.innerHTML = `
            <option value="">Selecione o material</option>
            ${this.materiais.map(m => {
                const valor = this.parseValue(m.valor_total);
                return `<option value="${m.id}">${m.nome || m.name} - R$ ${valor.toFixed(2)}</option>`;
            }).join('')}
        `;
    }

    renderMateriais() {
        const tbody = this.matTable.querySelector('tbody');
        
        // ✅ VERIFICAÇÃO MUITO SEGURA
        if (!this.materiais || !Array.isArray(this.materiais) || this.materiais.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="small" style="text-align:center;">Nenhum material cadastrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.materiais.map(m => {
            // ✅ USA A FUNÇÃO parseValue PARA GARANTIR NÚMEROS
            const valor = this.parseValue(m.valor_total || m.valor);
            const qtd = this.parseValue(m.quantidade || m.qty);
            const custoUnit = qtd > 0 ? valor / qtd : 0;
            const nome = m.nome || m.name || 'Sem nome';
            
            // ✅ DEBUG: Verifique os valores
            console.log(`Material ${m.id}: valor=${valor} (${typeof valor}), qtd=${qtd} (${typeof qtd})`);
            
            return `
                <tr>
                    <td>${nome}</td>
                    <td>R$ ${valor.toFixed(2)}</td>
                    <td>${qtd.toFixed(4)}</td>
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
            const resultado = await app.apiCall('/materiais', {
                method: 'POST',
                body: JSON.stringify({
                    nome: name,
                    valor_total: totalValue,  // ✅ Já é número
                    quantidade: qty          // ✅ Já é número
                })
            });

            console.log('✅ Material salvo (RAW):', resultado);
            
            // ✅ CONVERTE o resultado também
            const materialConvertido = {
                ...resultado,
                valor_total: this.parseValue(resultado.valor_total),
                quantidade: this.parseValue(resultado.quantidade)
            };
            
            console.log('✅ Material convertido:', materialConvertido);
            
            await this.loadMateriais();
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
            const resultado = await app.apiCall('/calcular-custo', {
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
                detalhesHTML = '<ul>' + resultado.detalhes.map(d => {
                    const custoUnit = this.parseValue(d.custo_unitario);
                    const custoTotal = this.parseValue(d.custo_total);
                    return `<li>${d.nome}: R$ ${custoUnit.toFixed(4)} × ${d.quantidade_usada} = R$ ${custoTotal.toFixed(2)}</li>`;
                }).join('') + '</ul>';
            }

            resultContent.innerHTML = `
                <p><strong>Produto:</strong> ${resultado.produto || productName}</p>
                <p><strong>Custo Total:</strong> R$ ${this.parseValue(resultado.custo_total).toFixed(2)}</p>
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
