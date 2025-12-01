// js/utils.js - VERSÃO 100% COMPLETA E CORRIGIDA
class Utils {
    // ✅ CORREÇÃO: Formatar moeda com tratamento de NaN
    static formatCurrency(value, currency = 'BRL') {
        // Garantir que é um número
        const numero = this.toSafeNumber(value);

        if (isNaN(numero)) {
            console.warn('⚠️ Valor inválido para formatação:', value);
            return 'R$ 0,00';
        }

        try {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: currency
            }).format(numero);
        } catch (error) {
            console.error('❌ Erro ao formatar moeda:', error);
            return `R$ ${numero.toFixed(2).replace('.', ',')}`;
        }
    }

    // ✅ CORREÇÃO: Formatar data
    static formatDate(dateString) {
        if (!dateString) return '-';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';

            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            console.error('❌ Erro ao formatar data:', error);
            return '-';
        }
    }

    // ✅ CORREÇÃO: Validar email
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // ✅ CORREÇÃO: Validar CPF
    static validateCPF(cpf) {
        if (!cpf) return false;
        cpf = cpf.replace(/[^\d]/g, '');
        if (cpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        return true;
    }

    // ✅ CORREÇÃO: Mostrar loading
    static showLoading() {
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.innerHTML = `
                <div style="text-align: center; color: white;">
                    <div style="font-size: 18px; margin-bottom: 10px;">⏳</div>
                    <div>Carregando...</div>
                </div>
            `;
            loader.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 30px 40px;
                border-radius: 15px;
                z-index: 9999;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                font-size: 16px;
                font-weight: bold;
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
    }

    // ✅ CORREÇÃO: Esconder loading
    static hideLoading() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    // ✅ CORREÇÃO: Mostrar mensagem
    static showMessage(message, type = 'info', duration = 4000) {
        // Remover mensagens anteriores
        const existingMessages = document.querySelectorAll('.custom-message');
        existingMessages.forEach(msg => msg.remove());

        const messageEl = document.createElement('div');
        messageEl.className = 'custom-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            z-index: 10000;
            font-weight: bold;
            max-width: 400px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
        `;

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        messageEl.style.background = colors[type] || colors.info;

        // Adicionar ícone
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        messageEl.textContent = `${icons[type] || ''} ${message}`;

        document.body.appendChild(messageEl);

        // Animação de entrada
        messageEl.style.transform = 'translateX(100%)';
        messageEl.style.transition = 'transform 0.3s ease';

        setTimeout(() => {
            messageEl.style.transform = 'translateX(0)';
        }, 10);

        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                }, 300);
            }
        }, duration);
    }

    // ✅ CORREÇÃO: Gerar ID único
    static generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // ✅✅✅ NOVA FUNÇÃO: toSafeNumber - ESSA É A QUE FALTAVA!
    static toSafeNumber(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        if (typeof value === 'number') {
            return isNaN(value) ? 0 : value;
        }

        if (typeof value === 'string') {
            // mantém pontos e vírgulas
            const cleaned = value.replace(',', '.');
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
        }

        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    // ✅ NOVA FUNÇÃO: Validar número
    static isValidNumber(value) {
        const num = this.toSafeNumber(value);
        return !isNaN(num) && isFinite(num);
    }

    // ✅ NOVA FUNÇÃO: Converter para número com fallback
    static parseNumber(value, defaultValue = 0) {
        const num = this.toSafeNumber(value);
        return isNaN(num) ? defaultValue : num;
    }
}