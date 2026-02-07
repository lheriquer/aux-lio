// ============================================
// ENGINE.JS - Sistema Completo de Gerenciamento
// VERSÃO CORRIGIDA - SEM EMAILJS
// ============================================

const app = {
  
  // CONFIGURACOES DO SISTEMA
  ownerEmail: 'lipezada@gmail.com', // MUDE AQUI PARA SEU EMAIL
  
  // Usuario atual logado
  currentUser: null,
  
  // Configuracoes do painel
  settings: {
    aimAssist: false,
    sensitivity: false,
    recoilControl: false
  },
  
  // Contador de cliques para acessar painel owner
  ownerClicks: 0,

  // ============================================
  // FUNCAO: init()
  // ============================================
  init() {
    console.log('Sistema iniciado!');
    
    // Verifica se ja esta logado
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        this.checkExpiration();
      } catch(e) {
        console.error('Erro ao carregar usuário:', e);
        localStorage.removeItem('currentUser');
      }
    }
  },

  // ============================================
  // FUNCAO: login()
  // ============================================
  login() {
    const emailField = document.getElementById('emailInput');
    const userEmail = emailField.value.trim().toLowerCase();
    
    // Valida se digitou algo
    if (!userEmail) {
      alert('Digite seu email!');
      return;
    }

    // Valida formato do email
    if (!this.isValidEmail(userEmail)) {
      alert('Email invalido!');
      return;
    }

    // Verifica se e o DONO
    if (userEmail === this.ownerEmail) {
      this.loginAsOwner();
      return;
    }

    // Verifica se esta aprovado
    const users = this.getUsers();
    const foundUser = users.find(u => u.email === userEmail);

    if (foundUser) {
      // Verifica se expirou
      if (foundUser.expiresAt && new Date(foundUser.expiresAt) < new Date()) {
        alert('Seu acesso expirou! Entre em contato com o administrador.');
        return;
      }

      // Login bem sucedido
      this.currentUser = foundUser;
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
      this.showPanel();
    } else {
      // Usuario nao aprovado - solicita acesso
      this.requestAccess(userEmail);
    }
  },

  // ============================================
  // FUNCAO: loginAsOwner()
  // ============================================
  loginAsOwner() {
    this.currentUser = {
      email: this.ownerEmail,
      role: 'owner',
      approvedAt: new Date().toISOString(),
      expiresAt: null
    };
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    alert('Bem-vindo, DONO! 👑');
    this.showPanel();
  },

  // ============================================
  // FUNCAO: requestAccess(userEmail)
  // ============================================
  requestAccess(userEmail) {
    const pending = this.getPending();
    
    // Verifica se ja solicitou
    if (pending.find(p => p.email === userEmail)) {
      alert('Seu pedido ja esta pendente! Aguarde a aprovacao.');
      return;
    }

    // Adiciona na lista de pendentes
    pending.push({
      email: userEmail,
      requestedAt: new Date().toISOString()
    });
    localStorage.setItem('pendingUsers', JSON.stringify(pending));
    
    alert('Solicitacao enviada! Aguarde a aprovacao do administrador.');
    document.getElementById('emailInput').value = '';
  },

  // ============================================
  // FUNCAO: showPanel()
  // ============================================
  showPanel() {
    console.log('Mostrando painel...');
    document.getElementById('login').classList.add('hidden');
    document.getElementById('panel').classList.remove('hidden');
    
    let title = 'Painel de Controle';
    if (this.currentUser.role === 'owner') {
      title += ' <span class="badge owner">DONO</span>';
    } else if (this.currentUser.role === 'admin') {
      title += ' <span class="badge admin">ADMIN</span>';
    }
    document.getElementById('panelTitle').innerHTML = title;
  },

  // ============================================
  // FUNCAO: checkOwner()
  // ============================================
  checkOwner() {
    if (this.currentUser && this.currentUser.role === 'owner') {
      this.ownerClicks++;
      console.log('Cliques:', this.ownerClicks);
      if (this.ownerClicks >= 5) {
        this.ownerClicks = 0;
        this.showOwnerPanel();
      } else {
        // Mostra quantos cliques faltam
        const faltam = 5 - this.ownerClicks;
        document.getElementById('statusText').textContent = `${faltam} cliques para gerenciar`;
      }
    }
  },

  // ============================================
  // FUNCAO: showOwnerPanel()
  // ============================================
  showOwnerPanel() {
    document.getElementById('panel').classList.add('hidden');
    document.getElementById('owner').classList.remove('hidden');
    this.showPending();
  },

  // ============================================
  // FUNCAO: showPending()
  // ============================================
  showPending() {
    const pending = this.getPending();
    const count = pending.length;
    
    document.getElementById('pendingCount').textContent = count;
    document.getElementById('pendingList').classList.remove('hidden');
    document.getElementById('approvedList').classList.add('hidden');

    if (count === 0) {
      document.getElementById('pendingList').innerHTML = '<div class="info-text">Nenhuma solicitacao pendente</div>';
      return;
    }

    let html = '';
    pending.forEach((user, index) => {
      const date = new Date(user.requestedAt).toLocaleString('pt-BR');
      html += `
        <div class="user-item">
          <div class="user-email">${user.email}</div>
          <div class="user-info">Solicitado em: ${date}</div>
          
          <select id="role_${index}">
            <option value="user">Usuario Normal</option>
            <option value="admin">Administrador</option>
          </select>
          
          <select id="days_${index}">
            <option value="1">1 dia</option>
            <option value="3">3 dias</option>
            <option value="7">7 dias</option>
            <option value="15">15 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="365">1 ano</option>
            <option value="99999">Permanente</option>
          </select>
          
          <div class="user-actions">
            <button onclick="app.approveUser('${user.email}', ${index})">Aprovar</button>
            <button class="secondary" onclick="app.rejectUser('${user.email}')">Rejeitar</button>
          </div>
        </div>
      `;
    });
    
    document.getElementById('pendingList').innerHTML = html;
  },

  // ============================================
  // FUNCAO: showApproved()
  // ============================================
  showApproved() {
    const users = this.getUsers();
    
    document.getElementById('pendingList').classList.add('hidden');
    document.getElementById('approvedList').classList.remove('hidden');

    if (users.length === 0) {
      document.getElementById('approvedList').innerHTML = '<div class="info-text">Nenhum usuario aprovado</div>';
      return;
    }

    let html = '';
    users.forEach(user => {
      const approvedDate = new Date(user.approvedAt).toLocaleDateString('pt-BR');
      const roleText = user.role === 'admin' ? 'Admin' : 'Usuario';
      const badge = user.role === 'admin' ? 'badge admin' : 'badge user';
      
      let expiryInfo = '';
      if (user.expiresAt) {
        const expiryDate = new Date(user.expiresAt);
        const isExpired = expiryDate < new Date();
        if (isExpired) {
          expiryInfo = '<span class="expired-tag">EXPIRADO</span>';
        } else {
          expiryInfo = `<span class="approved-tag">Expira em: ${expiryDate.toLocaleDateString('pt-BR')}</span>`;
        }
      } else {
        expiryInfo = '<span class="approved-tag">PERMANENTE</span>';
      }
      
      html += `
        <div class="user-item">
          <div class="user-email">
            ${user.email}
            <span class="${badge}">${roleText}</span>
          </div>
          <div class="user-info">
            Aprovado em: ${approvedDate}
            ${expiryInfo}
          </div>
          <div class="user-actions">
            <button class="secondary" onclick="app.removeUser('${user.email}')">Remover</button>
          </div>
        </div>
      `;
    });
    
    document.getElementById('approvedList').innerHTML = html;
  },

  // ============================================
  // FUNCAO: approveUser(email, index)
  // ============================================
  approveUser(email, index) {
    const role = document.getElementById(`role_${index}`).value;
    const days = parseInt(document.getElementById(`days_${index}`).value);
    
    const users = this.getUsers();
    const expiresAt = days === 99999 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    
    // Adiciona usuario aprovado
    users.push({
      email: email,
      role: role,
      approvedAt: new Date().toISOString(),
      expiresAt: expiresAt
    });
    
    localStorage.setItem('users', JSON.stringify(users));
    
    // Remove dos pendentes
    const pending = this.getPending().filter(p => p.email !== email);
    localStorage.setItem('pendingUsers', JSON.stringify(pending));
    
    alert(`✅ ${email} foi aprovado como ${role === 'admin' ? 'Admin' : 'Usuario'}!`);
    this.showPending();
  },

  // ============================================
  // FUNCAO: rejectUser(email)
  // ============================================
  rejectUser(email) {
    if (!confirm(`Rejeitar ${email}?`)) return;
    
    const pending = this.getPending().filter(p => p.email !== email);
    localStorage.setItem('pendingUsers', JSON.stringify(pending));
    
    alert('❌ Solicitacao rejeitada!');
    this.showPending();
  },

  // ============================================
  // FUNCAO: removeUser(email)
  // ============================================
  removeUser(email) {
    if (!confirm(`Remover ${email}?`)) return;
    
    const users = this.getUsers().filter(u => u.email !== email);
    localStorage.setItem('users', JSON.stringify(users));
    
    alert('🗑️ Usuario removido!');
    this.showApproved();
  },

  // ============================================
  // FUNCAO: backToPanel()
  // ============================================
  backToPanel() {
    document.getElementById('owner').classList.add('hidden');
    document.getElementById('panel').classList.remove('hidden');
  },

  // ============================================
  // FUNCAO: toggle(element, setting)
  // ============================================
  toggle(element, setting) {
    const toggleBtn = element.querySelector('.toggle');
    toggleBtn.classList.toggle('active');
    this.settings[setting] = toggleBtn.classList.contains('active');
    
    const names = {
      aimAssist: 'Aim Assist',
      sensitivity: 'Sensibilidade',
      recoilControl: 'Controle de Recuo'
    };
    
    const status = this.settings[setting] ? 'ativado' : 'desativado';
    document.getElementById('statusText').textContent = `${names[setting]} ${status}`;
  },

  // ============================================
  // FUNCAO: applySettings()
  // ============================================
  applySettings() {
    const active = Object.values(this.settings).some(v => v);
    if (!active) {
      alert('Ative pelo menos uma opcao!');
      return;
    }
    
    document.getElementById('statusText').textContent = 'Aplicando...';
    setTimeout(() => {
      alert('✅ Configuracoes aplicadas com sucesso!');
      document.getElementById('statusText').textContent = 'Configuracoes aplicadas!';
      if (navigator.vibrate) navigator.vibrate(200);
    }, 1500);
  },

  // ============================================
  // FUNCAO: openFF()
  // ============================================
  openFF() {
    const pkg = 'com.dts.freefireth';
    
    // Tenta abrir o app
    window.location.href = `intent://${pkg}#Intent;scheme=android-app;package=${pkg};end`;
    
    // Se não abrir, mostra a Play Store
    setTimeout(() => {
      const playStoreUrl = `https://play.google.com/store/apps/details?id=${pkg}`;
      window.open(playStoreUrl, '_blank');
    }, 2000);
  },

  // ============================================
  // FUNCAO: installPWA()
  // ============================================
  installPWA() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      alert('✅ App ja instalado!');
      return;
    }
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      alert('📱 iOS: Toque em Compartilhar (↑) e depois em "Adicionar a Tela de Inicio"');
    } else if (isAndroid) {
      alert('📱 Android: Menu (⋮) e depois "Instalar app" ou "Adicionar a tela inicial"');
    } else {
      alert('💻 Desktop: Clique no icone de instalacao (+) na barra de endereco');
    }
  },

  // ============================================
  // FUNCAO: logout()
  // ============================================
  logout() {
    if (confirm('Deseja sair?')) {
      localStorage.removeItem('currentUser');
      this.currentUser = null;
      this.settings = {
        aimAssist: false,
        sensitivity: false,
        recoilControl: false
      };
      
      document.getElementById('panel').classList.add('hidden');
      document.getElementById('owner').classList.add('hidden');
      document.getElementById('login').classList.remove('hidden');
      document.getElementById('emailInput').value = '';
      document.getElementById('statusText').textContent = 'Sistema Pronto';
    }
  },

  // ============================================
  // FUNCAO: checkExpiration()
  // ============================================
  checkExpiration() {
    if (this.currentUser && this.currentUser.expiresAt) {
      if (new Date(this.currentUser.expiresAt) < new Date()) {
        alert('⚠️ Seu acesso expirou!');
        this.logout();
        return;
      }
    }
    this.showPanel();
  },

  // ============================================
  // FUNCOES AUXILIARES
  // ============================================

  getUsers() {
    try {
      return JSON.parse(localStorage.getItem('users') || '[]');
    } catch(e) {
      return [];
    }
  },

  getPending() {
    try {
      return JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    } catch(e) {
      return [];
    }
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

// Inicializa ao carregar a pagina
window.onload = () => {
  console.log('Página carregada!');
  app.init();
};
