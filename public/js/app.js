// js/app.js - Arquivo principal do AuraCash COM CATEGORIAS PADRÃO
class AuraCash {
    constructor() {
        this.API_BASE = 'http://localhost:3000/api';
        this.currentUser = this.getCurrentUser();
        this.init();
    }

    init() {
        this.setupLogout();
        this.loadUserData();
        this.setActiveNavLink();
        this.setCurrentDate();
        this.initDefaultCategories(); // ✅ NOVA LINHA - categorias padrão
    }

    // ✅ NOVO MÉTODO - Criar categorias padrão
    initDefaultCategories() {
    if (this.currentUser) {
        const existingCategories = JSON.parse(localStorage.getItem('auraCash_categorias') || '[]');
        const userCategories = existingCategories.filter(cat => cat.userId === this.currentUser.id);

        if (userCategories.length === 0) {
            console.log('🔄 Criando categorias padrão para o usuário...');

            const defaultCategories = [
                // ✅ CORRIGIDO: Usar 'name' em vez de 'nome'
                { id: 1, name: '🏠 Moradia', type: 'expense', userId: this.currentUser.id },
                { id: 2, name: '🍽️ Alimentação', type: 'expense', userId: this.currentUser.id },
                { id: 3, name: '🚗 Transporte', type: 'expense', userId: this.currentUser.id },
                { id: 4, name: '💊 Saúde', type: 'expense', userId: this.currentUser.id },
                { id: 5, name: '🎓 Educação', type: 'expense', userId: this.currentUser.id },
                { id: 6, name: '🎉 Lazer', type: 'expense', userId: this.currentUser.id },
                { id: 7, name: '🛍️ Compras', type: 'expense', userId: this.currentUser.id },
                { id: 8, name: '💸 Outras Despesas', type: 'expense', userId: this.currentUser.id },

                // RECEITAS
                { id: 9, name: '💰 Salário', type: 'income', userId: this.currentUser.id },
                { id: 10, name: '💼 Freelance', type: 'income', userId: this.currentUser.id },
                { id: 11, name: '📈 Investimentos', type: 'income', userId: this.currentUser.id },
                { id: 12, name: '💎 Outras Receitas', type: 'income', userId: this.currentUser.id }
            ];

            console.log('✅ Categorias padrão a serem criadas:', defaultCategories);

            const allCategories = [...existingCategories, ...defaultCategories];
            localStorage.setItem('auraCash_categorias', JSON.stringify(allCategories));
            console.log('🎉 Categorias padrão criadas com sucesso!');
            
            // ✅ DEBUG: Verificar se salvou corretamente
            const categoriasVerificadas = JSON.parse(localStorage.getItem('auraCash_categorias') || '[]');
            console.log('📝 Categorias após criação:', categoriasVerificadas);
        } else {
            console.log('ℹ️ Categorias já existem para este usuário:', userCategories);
        }
    } else {
        console.log('⚠️ Usuário não logado, não criando categorias padrão');
    }
}

    // Gerenciamento de usuário
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser')) || null;
    }

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUser = user;

        // ✅ Criar categorias quando um novo usuário fizer login
        setTimeout(() => {
            this.initDefaultCategories();
        }, 100);
    }

    logout() {
        console.log('🚪 INICIANDO LOGOUT...');

        if (confirm('Tem certeza que deseja sair?')) {
            // ✅ APENAS limpa o usuário atual - MANTÉM os dados no MySQL
            localStorage.removeItem('currentUser');
            console.log('✅ Apenas usuário removido - dados mantidos no MySQL');

            // ✅ NÃO limpa transações, categorias, metas - ficam no MySQL
            // localStorage.removeItem('auraCash_transacoes');   // ❌ REMOVIDO
            // localStorage.removeItem('auraCash_categorias');   // ❌ REMOVIDO  
            // localStorage.removeItem('auraCash_metas');        // ❌ REMOVIDO
            // localStorage.removeItem('auraCash_materiais');    // ❌ REMOVIDO
            // localStorage.removeItem('auraCash_shared-accounts'); // ❌ REMOVIDO

            // Redirecionar
            const currentPath = window.location.pathname;
            const loginPage = currentPath.includes('/pages/') ? '../tlogin.html' : 'tlogin.html';

            console.log('🔄 Redirecionando para login...');
            window.location.href = loginPage;
        }
    }

    setupLogout() {
        const logoutLinks = document.querySelectorAll('#logoutLink');
        logoutLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }

    setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('.navbar a');

        navLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (linkHref === currentPage) {
                link.style.background = 'rgba(255,255,255,0.5)';
                link.style.fontWeight = 'bold';
            }
        });
    }

    setCurrentDate() {
        // Preenche campos de data com a data atual
        const today = new Date().toISOString().split('T')[0];
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            if (!input.value) {
                if (input.id.includes('From') || input.id.includes('Date')) {
                    input.value = today;
                } else if (input.id.includes('To')) {
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    input.value = nextMonth.toISOString().split('T')[0];
                }
            }
        });
    }

    // API Calls (com fallback para localStorage)
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.currentUser ? `Bearer ${this.currentUser.token}` : '',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) throw new Error('Erro na requisição');
            return await response.json();
        } catch (error) {
            console.log('API offline, usando localStorage...');
            return this.localStorageFallback(endpoint, options);
        }
    }

    localStorageFallback(endpoint, options) {
        const resource = endpoint.split('/')[1];
        const key = `auraCash_${resource}`;

        console.log(`🔄 localStorageFallback: ${options.method} ${endpoint}`);
        console.log('📦 Dados recebidos:', options.body);

        switch (options.method) {
            case 'GET':
                const data = JSON.parse(localStorage.getItem(key)) || [];
                console.log(`📂 GET ${key}:`, data);

                // Se for uma busca por ID
                if (endpoint.includes('/') && endpoint.split('/').length > 2) {
                    const id = parseInt(endpoint.split('/')[2]);
                    const item = data.find(item => item.id === id) || null;
                    console.log(`🔍 Buscando ID ${id}:`, item);
                    return item;
                }
                return data;

            case 'POST':
                const newData = options.body ? JSON.parse(options.body) : {};
                const existingData = JSON.parse(localStorage.getItem(key)) || [];

                // ✅ GARANTIR que tem ID e userId
                newData.id = Date.now();
                if (!newData.userId && app.currentUser) {
                    newData.userId = app.currentUser.id;
                }

                console.log('➕ NOVA CATEGORIA:', newData);

                existingData.push(newData);
                localStorage.setItem(key, JSON.stringify(existingData));

                console.log(`💾 SALVO em ${key}:`, existingData);
                return newData;

            case 'PUT':
                const updateData = JSON.parse(options.body);
                const allData = JSON.parse(localStorage.getItem(key)) || [];
                const index = allData.findIndex(item => item.id === updateData.id);
                if (index !== -1) {
                    allData[index] = { ...allData[index], ...updateData };
                    localStorage.setItem(key, JSON.stringify(allData));
                }
                return updateData;

            case 'DELETE':
                const id = parseInt(endpoint.split('/')[2]);
                const deleteData = JSON.parse(localStorage.getItem(key)) || [];
                const filteredData = deleteData.filter(item => item.id !== id);
                localStorage.setItem(key, JSON.stringify(filteredData));
                console.log(`🗑️ DELETADO ID ${id} de ${key}`);
                return { message: 'Deleted' };

            default:
                return [];
        }
    }

    // Verificar autenticação
    loadUserData() {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('tlogin.html') || currentPath.includes('tcadastro.html');

        if (!this.currentUser && !isAuthPage) {
            window.location.href = '../tlogin.html';
        }

        // Se estiver logado e tentar acessar login/cadastro, redireciona para dashboard
        if (this.currentUser && isAuthPage) {
            window.location.href = 'pages/tdashboard.html';
        }
    }

    
}

// Inicializar app
const app = new AuraCash();
window.app = app; // ✅ Torna o app global