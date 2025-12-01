// js/empreendedor.js - VERSÃO FUNCIONAL COM SALVAMENTO LOCAL POR USUÁRIO
class EmpreendedorManager {
    constructor() {
        this.matForm = document.getElementById('matForm');
        this.matTable = document.getElementById('matTable');
        this.prodForm = document.getElementById('prodForm');
        this.matUses = document.getElementById('matUses');
        this.materiais = [];
        this.userId = this.getUserId();
        this.init();
    }

    getUserId() {
        // Pega o ID do usuário logado do localStorage
        const userData = JSON.parse(localStorage.getItem('auraCash_user') || '{}');
        return userData.id || 'default';
    }

    init() {
        console.log('🚀 Inicializando módulo empreendedor...');
        this.setupForms();
        this.loadMateriais();
        this.addMaterialUseRow();
    }

    setupForms() {
        if (this.matForm) {
            this.matForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMaterial();
            });
        }

        if (this.prodForm) {
            this.prodForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.calcularCusto();
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

    loadMateriais() {
        try {
            // ✅ CORREÇÃO: Salva materiais por usuário
            const allMateriais = JSON.parse(localStorage.getItem('auraCash_materiais') || '{}');
            this.materiais = allMateriais[this.userId] || [];
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
            ${this.materiais.map(m => `<option value="${m.id}">${m.name} - R$ ${m.totalValue.toFixed(2)}</option>`).join('')}
        `;
    }

    renderMateriais() {
        const tbody = this.matTable.querySelector('tbody');
        if (!this.materiais.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="small" style="text-align:center;">Nenhum material cadastrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.materiais.map(m => {
            const custoUnit = m.qty > 0 ? m.totalValue / m.qty : 0;
            return `
                <tr>
                    <td>${m.name}</td>
                    <td>R$ ${m.totalValue.toFixed(2)}</td>
                    <td>${m.qty.toFixed(4)}</td>
                    <td>R$ ${custoUnit.toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    }

    saveMaterial() {
        const name = document.getElementById('materialName').value.trim();
        const totalValue = parseFloat(document.getElementById('materialValue').value);
        const qty = parseFloat(document.getElementById('materialQty').value);

        if (!name || totalValue <= 0 || qty <= 0) {
            alert('Preencha todos os campos corretamente!');
            return;
        }

        const newMaterial = {
            id: Date.now(),
            name,
            totalValue,
            qty
        };

        // ✅ CORREÇÃO: Salva materiais por usuário
        const allMateriais = JSON.parse(localStorage.getItem('auraCash_materiais') || '{}');
        if (!allMateriais[this.userId]) {
            allMateriais[this.userId] = [];
        }
        allMateriais[this.userId].push(newMaterial);
        localStorage.setItem('auraCash_materiais', JSON.stringify(allMateriais));

        this.materiais.push(newMaterial);
        this.renderMateriais();
        this.updateAllSelects();

        this.matForm.reset();
        alert('Material salvo com sucesso!');
    }

    updateAllSelects() {
        const selects = this.matUses.querySelectorAll('select[name="materialId"]');
        selects.forEach(sel => this.loadMateriaisIntoSelect(sel));
    }

    calcularCusto() {
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
                return { materialId: parseInt(materialId), qtyUsed };
            })
            .filter(x => x !== null);

        if (!materialUses.length) {
            alert('Adicione pelo menos um material válido.');
            return;
        }

        let custoTotal = 0;
        const detalhes = [];

        materialUses.forEach(use => {
            const mat = this.materiais.find(m => m.id === use.materialId);
            if (!mat) return;
            const custoUnit = mat.totalValue / mat.qty;
            const custoMat = custoUnit * use.qtyUsed;
            custoTotal += custoMat;
            detalhes.push({ nome: mat.name, unit: custoUnit, qtd: use.qtyUsed, total: custoMat });
        });

        const resultDiv = document.getElementById('result');
        const resultContent = document.getElementById('resultContent');
        resultContent.innerHTML = `
            <p><strong>Produto:</strong> ${productName}</p>
            <p><strong>Custo Total:</strong> R$ ${custoTotal.toFixed(2)}</p>
            <ul>
                ${detalhes.map(d => `<li>${d.nome}: R$ ${d.unit.toFixed(2)} × ${d.qtd} = R$ ${d.total.toFixed(2)}</li>`).join('')}
            </ul>
        `;
        resultDiv.style.display = 'block';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => new EmpreendedorManager());