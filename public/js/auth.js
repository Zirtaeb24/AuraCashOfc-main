// js/auth.js - VERSÃO COMPLETA
class AuthManager {
    constructor() {
        this.setupLogin();
        this.setupCadastro();
    }

    setupLogin() {
        const loginForm = document.querySelector('form[action="#"]');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.login();
            });
        }
    }

    setupCadastro() {
        const cadastroForm = document.querySelector('.cadastrar-form');
        if (cadastroForm) {
            cadastroForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.cadastrar();
            });
        }
    }

    async login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            Utils.showMessage('Preencha todos os campos', 'error');
            return;
        }

        Utils.showLoading();
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            localStorage.setItem('currentUser', JSON.stringify(data));
            if (window.app) {
                window.app.setCurrentUser(data);
            }

            Utils.showMessage('Login realizado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = 'pages/tdashboard.html';
            }, 1000);
        } catch (error) {
            Utils.showMessage('Login falhou: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async cadastrar() {
        const formData = new FormData(document.querySelector('.cadastrar-form'));
        const userData = {
            name: formData.get('name'),
            cpf: formData.get('cpf'),
            income: parseFloat(formData.get('income')),
            aid: formData.get('aid') === 'on',
            email: formData.get('email'),
            password: formData.get('password')
        };

        if (!userData.name || !userData.cpf || !userData.income || !userData.email || !userData.password) {
            Utils.showMessage('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (!Utils.validateEmail(userData.email)) {
            Utils.showMessage('Email inválido', 'error');
            return;
        }

        Utils.showLoading();
        try {
            const response = await fetch('/api/auth/cadastro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            localStorage.setItem('currentUser', JSON.stringify(data));
            if (window.app) {
                window.app.setCurrentUser(data);
            }

            Utils.showMessage('Cadastro realizado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = 'pages/tdashboard.html';
            }, 1000);
        } catch (error) {
            Utils.showMessage('Cadastro falhou: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }
}

if (document.querySelector('form[action="#"]') || document.querySelector('.cadastrar-form')) {
    new AuthManager();
}