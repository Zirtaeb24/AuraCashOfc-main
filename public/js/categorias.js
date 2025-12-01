// categorias.js CORRIGIDO
class CategoriasManager {
    constructor() {
        this.form = document.getElementById('catForm');
        this.list = document.getElementById('catList');
        this.init();
    }

    async init() {
        this.setupForm();
        await this.loadCategorias();
    }

    setupForm() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveCategoria();
        });
    }

    async saveCategoria() {
        const formData = new FormData(this.form);
        const categoria = {
            nome: formData.get('name'),
            tipo: formData.get('type')
        };

        console.log('Salvando categoria:', categoria); // DEBUG

        try {
            await app.apiCall('/categorias', {
                method: 'POST',
                body: JSON.stringify(categoria)
            });

            this.form.reset();
            await this.loadCategorias();
            Utils.showMessage('Categoria salva com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar categoria:', error);
            Utils.showMessage('Erro ao salvar categoria: ' + error.message, 'error');
        }
    }

    async loadCategorias() {
        try {
            const categorias = await app.apiCall('/categorias', { method: 'GET' });
            this.renderCategorias(categorias);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    renderCategorias(categorias) {
        console.log('Categorias para renderizar:', categorias); // DEBUG
        
        this.list.innerHTML = categorias.map(cat => `
            <div class="card" style="margin: 10px 0; padding: 15px;">
                <h4>${cat.nome || 'Nome não definido'}</h4>
                <p>Tipo: ${cat.tipo === 'income' ? 'Receita' : 'Despesa'}</p>
                <button onclick="categoriasManager.deleteCategoria(${cat.id})" class="btn btn-danger">Excluir</button>
            </div>
        `).join('') || '<div class="small">Nenhuma categoria cadastrada.</div>';
    }

    async deleteCategoria(id) {
        if (confirm('Tem certeza que deseja excluir esta categoria?')) {
            try {
                await app.apiCall(`/categorias/${id}`, { method: 'DELETE' });
                await this.loadCategorias();
                Utils.showMessage('Categoria excluída!', 'success');
            } catch (error) {
                Utils.showMessage('Erro ao excluir categoria', 'error');
            }
        }
    }
}

let categoriasManager;
if (document.getElementById('catForm')) {
    categoriasManager = new CategoriasManager();
}