// Variável global temporária para itens do pedido atual no modal
let tempOrderItems = [];

// ========= FUNÇÕES AUXILIARES DE ACESSO E DATA =========
/**
 * Obtém o perfil (role) do usuário logado do localStorage.
 * @returns {string|null} O perfil ('admin', 'waiter', 'kitchen') ou null se não estiver logado.
 */
function getUserRole() {
    return localStorage.getItem('userRole');
}

/**
 * Obtém a data atual no formato YYYY-MM-DD.
 * @returns {string} Data formatada.
 */
function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Gera a chave do localStorage para o faturamento total do dia.
 * @returns {string} A chave, ex: "dailyTotal_2023-10-27".
 */
function getDailyTotalKey() {
    return `dailyTotal_${getTodayDateString()}`;
}

/**
 * Gera a chave do localStorage para a lista de mesas já faturadas hoje.
 * @returns {string} A chave, ex: "billedTables_2023-10-27".
 */
function getBilledTablesKey() {
    return `billedTables_${getTodayDateString()}`;
}


/**
 * Verifica se o usuário logado tem permissão para acessar a página atual.
 * Redireciona para o login ou dashboard se não tiver permissão.
 * Deve ser chamada ANTES de inicializar a lógica específica da página.
 */
function checkAccess() {
    const userRole = getUserRole();
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    const publicPages = ['index.html', 'forgot_password.html']; // Páginas que não exigem login

    //console.log(`Verificando acesso - Página: ${currentPage}, Perfil: ${userRole}`);

    // Se for página pública, permite acesso
    if (publicPages.includes(currentPage)) {
        //console.log("Acesso permitido: Página pública.");
        // Se já estiver logado e tentar acessar o login, redireciona para o dashboard
        if (currentPage === 'index.html' && userRole) {
             console.warn("Usuário logado tentando acessar login. Redirecionando para dashboard...");
             window.location.href = 'admin_dashboard.html'; // Ou página inicial apropriada
             throw new Error("Redirecionando usuário logado para fora do login."); // Interrompe execução
        }
        return; // Permite acesso à página pública
    }

    // Se não for página pública e não estiver logado, redireciona para o login
    if (!userRole) {
        console.warn('Acesso bloqueado: Usuário não logado tentando acessar página restrita.');
        alert('Acesso não autorizado. Faça o login.');
        window.location.href = 'index.html';
        throw new Error("Redirecionando usuário não logado."); // Interrompe execução
    }

    // Define as páginas permitidas para cada perfil
    const allowedPages = {
        admin: ['admin_dashboard.html', 'admin_dishes.html', 'admin_tables.html', 'admin_orders.html', 'admin_manage_users.html', 'admin_profile.html'],
        waiter: ['admin_dashboard.html', 'admin_dishes.html', 'admin_tables.html', 'admin_profile.html'],
        kitchen: ['admin_dashboard.html', 'admin_dishes.html', 'admin_orders.html', 'admin_profile.html']
    };

    // Verifica se o perfil atual tem permissão para a página atual
    if (allowedPages[userRole] && allowedPages[userRole].includes(currentPage)) {
        //console.log(`Acesso permitido para perfil '${userRole}' na página '${currentPage}'.`);
        return; // Permite o acesso
    } else {
        console.warn(`Acesso BLOQUEADO para perfil '${userRole}' na página '${currentPage}'.`);
        alert('Você não tem permissão para acessar esta página.');
        // Redireciona para uma página padrão (ex: dashboard) ou login
        window.location.href = 'admin_dashboard.html'; // Ou index.html se preferir
        throw new Error("Redirecionando usuário sem permissão."); // Interrompe execução
    }
}

// ========= FIM DAS FUNÇÕES AUXILIARES DE ACESSO E DATA =========


document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM carregado. Iniciando script.");

    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    const publicPages = ['index.html', 'forgot_password.html'];

    // --- 1. Verificação de Acesso (SEMPRE, exceto em páginas públicas) ---
    if (!publicPages.includes(currentPage)) {
        try {
            checkAccess(); // Verifica se o usuário pode estar nesta página
        } catch (error) {
            console.warn("Redirecionamento devido à verificação de acesso.");
            // Importante: Interromper a execução do restante do script se checkAccess redirecionar
            return;
        }
    } else {
         // Para páginas públicas, verifica se já está logado (redireciona do login se já logado)
         try { checkAccess(); } catch (error) { return; }
    }


    // --- 2. Inicialização de Dados (APENAS se for a primeira vez ou dados ausentes) ---
    initializeLocalStorageData(); // Inicializa usuários, mesas, pratos, pedidos FAKE (se não existirem)

    // --- 3. Carregar e Inicializar Navbar (APENAS se o placeholder existir) ---
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        console.log("Placeholder da Navbar encontrado, carregando navbar...");
        loadNavbarAndInitializeScripts(); // Carrega navbar E inicializa scripts da página DENTRO dela
    } else {
        console.log("Placeholder da Navbar NÃO encontrado. Inicializando tema e lógica de página não-admin.");
        initializeThemeLogic(); // Tema funciona mesmo sem navbar completa
        initializePageSpecificLogic(); // Lógica específica para páginas como login/forgot_password
        setTimeout(() => {
            if(document.body) document.body.classList.remove('preload-transition');
            console.log("Preload transition removida (página sem navbar).");
        }, 50);
    }

}); // Fim do DOMContentLoaded

// ========= FUNÇÕES PRINCIPAIS =========
function loadNavbarAndInitializeScripts() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    fetch('/MesaFacil/_navbar.html')
        .then(response => {
            if (!response.ok) throw new Error(`Erro ao carregar _navbar.html: ${response.statusText}`);
            return response.text();
        })
        .then(html => {
            navbarPlaceholder.innerHTML = html;
            console.log("Navbar HTML carregada.");

            // Inicializa a lógica da navbar VISUAL (toggle, highlight)
            initializeNavbarLogic();
            // Ajusta a visibilidade dos itens da navbar com base no perfil
            adjustNavbarVisibility();
            // Inicializa a lógica do tema
            initializeThemeLogic();
            // Inicializa a lógica de logout
            initializeLogoutLogic();
            // Exibe o nome do usuário logado
            displayLoggedInUser();

            // Inicializa a lógica específica da página ATUAL (APÓS navbar carregada)
            initializePageSpecificLogic();

            // Remove a classe de pré-carregamento após tudo estar pronto
            setTimeout(() => {
                if (document.body) document.body.classList.remove('preload-transition');
                console.log("Preload transition removida.");
            }, 50);
        })
        .catch(error => {
            console.error("Falha ao carregar a navbar:", error);
            navbarPlaceholder.innerHTML = `<p class="text-danger p-3">Erro ao carregar a navegação.</p>`;
            // Ainda remove o preload para evitar página em branco
            setTimeout(() => { if(document.body) document.body.classList.remove('preload-transition'); }, 50);
        });
}


/**
 * Ajusta a visibilidade dos itens da navbar com base no perfil do usuário logado.
 * Deve ser chamada DEPOIS que o HTML da navbar foi carregado.
 */
function adjustNavbarVisibility() {
    const userRole = getUserRole();
    //console.log("Ajustando visibilidade da Navbar para o perfil:", userRole);

    if (!userRole) {
        console.warn("Nenhum perfil de usuário encontrado, não ajustando a navbar.");
        // Ocultar todos os itens exceto talvez login/registro se houvesse
        return;
    }

    const navItemsToHide = {
        waiter: ['nav-orders', 'nav-manage-users'], // Garçom não vê Pedidos nem Gerenciar Usuários
        kitchen: ['nav-tables', 'nav-manage-users']  // Cozinha não vê Mesas nem Gerenciar Usuários
        // Admin vê tudo, não precisa esconder nada
    };

    const itemsToHide = navItemsToHide[userRole] || [];

    //console.log("Itens da navbar a esconder:", itemsToHide);

    itemsToHide.forEach(itemId => {
        const item = document.getElementById(itemId);
        if (item) {
            item.style.display = 'none';
             //console.log(`Item ${itemId} escondido.`);
        } else {
             console.warn(`Item da navbar com ID ${itemId} não encontrado para esconder.`);
        }
    });
     //console.log("Visibilidade da Navbar ajustada.");
}


function initializeNavbarLogic() {
    const toggleMobile = document.getElementById('header-toggle');
    const nav = document.getElementById('nav-bar');
    const bodypd = document.getElementById('body-pd');
    const headerpd = document.getElementById('header');
    const desktopToggle = document.getElementById('nav-toggle-desktop');
    const isMobile = () => window.innerWidth < 768;

    if(!nav || !bodypd || !headerpd || !desktopToggle) {
        console.error("Elementos essenciais da Navbar visual não encontrados.");
        return;
    }

    // Função para aplicar o estado (recolhido/expandido) no desktop
    const applyDesktopState = (collapse) => {
        //console.log(`Aplicando estado desktop: ${collapse ? 'Colapsado' : 'Expandido'}`);
        if (collapse) {
            nav.classList.add('collapsed');
            bodypd.classList.remove('body-pd');
            bodypd.classList.add('body-pd-collapsed');
            headerpd.classList.remove('header-pd');
            headerpd.classList.add('header-pd-collapsed');
            localStorage.setItem('navbarState', 'collapsed');
        } else {
            nav.classList.remove('collapsed');
            bodypd.classList.remove('body-pd-collapsed');
            bodypd.classList.add('body-pd');
            headerpd.classList.remove('header-pd-collapsed');
            headerpd.classList.add('header-pd');
            localStorage.setItem('navbarState', 'expanded');
        }
    };

    // Função para alternar a visibilidade/estado da navbar
    const toggleNav = () => {
        //console.log("toggleNav chamado.");
        if (isMobile()) {
            nav.classList.toggle('show-nav'); // Mostra/esconde no mobile
        } else {
            const shouldCollapse = !nav.classList.contains('collapsed'); // Inverte o estado atual no desktop
            applyDesktopState(shouldCollapse);
        }
    };

    // Adiciona listeners aos botões de toggle
    if (toggleMobile) {
        toggleMobile.addEventListener('click', toggleNav);
    }
    if (desktopToggle) {
        desktopToggle.addEventListener('click', toggleNav);
    }

    // Restaura o estado da navbar no desktop ao carregar a página
    if (!isMobile()) {
        const savedState = localStorage.getItem('navbarState');
        //console.log("Restaurando estado desktop. Salvo:", savedState);
        // Recolhe apenas se explicitamente salvo como 'collapsed', senão expande
        applyDesktopState(savedState === 'collapsed');
    }

    // Destaca o link ativo na navbar
    const linkColor = document.querySelectorAll('.nav_link');
    const currentPath = window.location.pathname.split("/").pop();

    linkColor.forEach(l => {
        l.classList.remove('active'); // Remove de todos primeiro
        const linkPage = l.dataset.page;

        // Condição especial para dashboard (index ou admin_dashboard.html)
        if ((currentPath === '' || currentPath === 'admin_dashboard.html') && linkPage === 'admin_dashboard.html') {
            l.classList.add('active');
        }
        // Condição geral para outras páginas
        else if (linkPage === currentPath) {
            l.classList.add('active');
        }
    });

     //console.log("Lógica visual da Navbar inicializada.");
}

function initializeThemeLogic() {
    const darkModeSwitchHeader = document.getElementById('darkModeSwitchHeader'); // Switch no header
    const darkModeSwitchPage = document.getElementById('darkModeSwitch'); // Switch em páginas sem header (login, etc)
    const body = document.body;

    // Determina qual switch usar (pode haver um ou outro, ou ambos se o header existir)
    const currentSwitch = darkModeSwitchHeader || darkModeSwitchPage;
    const lightIcon = document.querySelector('.light-icon');
    const darkIcon = document.querySelector('.dark-icon');


    if (!currentSwitch) {
        console.warn("Nenhum switch de tema encontrado nesta página.");
        // Mesmo sem switch, aplica o tema salvo ou preferência
        setThemeFromStorageOrPreference(null);
        return;
    }

    // Aplica o tema (dark/light) ao body e atualiza o estado do(s) switch(es) e icones
    function applyTheme(theme, initiatingSwitch) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            if(currentSwitch) currentSwitch.checked = true; // Atualiza o switch principal
            // Se houver os dois switches, sincroniza o outro
            if (darkModeSwitchHeader && darkModeSwitchPage && initiatingSwitch !== darkModeSwitchHeader) darkModeSwitchHeader.checked = true;
            if (darkModeSwitchHeader && darkModeSwitchPage && initiatingSwitch !== darkModeSwitchPage) darkModeSwitchPage.checked = true;
            // Atualiza icones (se existirem)
            if(lightIcon) lightIcon.style.display = 'none';
            if(darkIcon) darkIcon.style.display = 'inline-block';

        } else {
            body.classList.remove('dark-mode');
            if(currentSwitch) currentSwitch.checked = false; // Atualiza o switch principal
            // Sincroniza o outro switch se existir
            if (darkModeSwitchHeader && darkModeSwitchPage && initiatingSwitch !== darkModeSwitchHeader) darkModeSwitchHeader.checked = false;
            if (darkModeSwitchHeader && darkModeSwitchPage && initiatingSwitch !== darkModeSwitchPage) darkModeSwitchPage.checked = false;
             // Atualiza icones (se existirem)
             if(lightIcon) lightIcon.style.display = 'inline-block';
             if(darkIcon) darkIcon.style.display = 'none';
        }
    }

    // Define o tema inicial com base no localStorage ou preferência do sistema
    function setThemeFromStorageOrPreference(switchElement) {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        let currentTheme = 'light'; // Padrão é light

        if (savedTheme) {
            currentTheme = savedTheme; // Usa o tema salvo
        } else if (prefersDark) {
            currentTheme = 'dark'; // Usa a preferência do sistema se não houver nada salvo
        }

        applyTheme(currentTheme, switchElement);
        //console.log("Tema inicial definido como:", currentTheme);
    }

    // Função para lidar com a mudança de tema pelo usuário
    function handleThemeChange(event) {
        const newTheme = event.target.checked ? 'dark' : 'light';
        applyTheme(newTheme, event.target); // Aplica o novo tema e sincroniza os switches/icones
        localStorage.setItem('theme', newTheme); // Salva a escolha do usuário
         //console.log("Tema alterado para:", newTheme);
    }

    // Adiciona listener ao(s) switch(es) encontrado(s)
    if (darkModeSwitchHeader) {
        darkModeSwitchHeader.addEventListener('change', handleThemeChange);
    }
    if (darkModeSwitchPage && darkModeSwitchPage !== darkModeSwitchHeader) { // Evita adicionar listener duas vezes se for o mesmo elemento
        darkModeSwitchPage.addEventListener('change', handleThemeChange);
    }

    // Listener para mudanças na preferência do sistema (caso o usuário não tenha definido um tema)
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) { // Só muda se não houver preferência salva
            applyTheme(e.matches ? 'dark' : 'light', currentSwitch);
        }
    });

    // Define o tema inicial ao carregar a página
    setThemeFromStorageOrPreference(currentSwitch);
    //console.log("Lógica do Tema inicializada.");
}

function initializeLogoutLogic() {
    const logoutLinks = document.querySelectorAll('#logout-link, #header-logout-link-mobile');
    logoutLinks.forEach(link => {
        if(link) {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                console.log('Logout...');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userId'); // Remove o ID também
                // Opcional: Limpar outros dados de sessão se necessário
                // localStorage.removeItem('navbarState');
                // localStorage.removeItem('theme');
                // Poderia limpar os totais diários aqui, mas talvez seja melhor manter
                window.location.href = 'index.html'; // Redireciona para a página de login
            });
        }
    });
     //console.log("Lógica de Logout inicializada.");
}

function displayLoggedInUser() {
    const loggedInUserEmail = localStorage.getItem('userEmail');
    if (loggedInUserEmail) {
        const userNameMobile = document.getElementById('loggedInUserNameDisplayMobile'); // Pode não existir mais
        const userNameDesktop = document.getElementById('loggedInUserNameDisplay');
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const currentUser = users.find(u => u.email === loggedInUserEmail);

        // Usa o primeiro nome do usuário ou a parte antes do @ do email
        const displayName = currentUser ? currentUser.name.split(' ')[0] : loggedInUserEmail.split('@')[0];

        if(userNameMobile) { // Verifica se o elemento existe antes de tentar usar
            userNameMobile.textContent = `Olá, ${displayName}`;
        }
        if(userNameDesktop) {
            userNameDesktop.textContent = `Olá, ${displayName}`;
        }
        //console.log(`Usuário logado (${displayName}) exibido.`);
    } else {
         //console.log("Nenhum usuário logado para exibir.");
    }
}

function initializePageSpecificLogic() {
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    console.log("Inicializando lógica para página:", currentPage);

    switch (currentPage) {
        case 'admin_manage_users.html':
            initializeManageUsersPage();
            break;
        case 'admin_dashboard.html':
            initializeDashboardPage();
            break;
        case 'admin_tables.html':
            initializeTablesPage();
            break;
        case 'admin_dishes.html':
            initializeDishesPage();
            break;
        case 'admin_orders.html':
            initializeOrdersPage();
            break;
        case 'admin_profile.html':
            initializeProfilePage();
            break;
        case 'index.html':
            initializeLoginPage();
            break;
        case 'forgot_password.html':
            initializeForgotPasswordPage();
            break;
        // Adicionar outros casos se houver mais páginas específicas
        default:
            console.log(`Nenhuma lógica específica definida para a página ${currentPage}.`);
    }
}

// --- Lógica da Página: Meu Perfil ---
function initializeProfilePage() {
    //console.log("Inicializando initializeProfilePage...");
    const profileForm = document.getElementById('profileForm');
    const nameInput = document.getElementById('profileName');
    const emailInput = document.getElementById('profileEmail');
    const newPasswordInput = document.getElementById('profileNewPassword');
    const confirmPasswordInput = document.getElementById('profileConfirmPassword');
    const imagePreview = document.getElementById('profileImagePreview');
    const currentImageNameSpan = document.getElementById('profileCurrentImageName');
    const imageInput = document.getElementById('profileImage');
    const messageDiv = document.getElementById('profileForm-message');

    if (!profileForm || !nameInput || !emailInput || !newPasswordInput || !confirmPasswordInput || !imagePreview || !currentImageNameSpan || !imageInput || !messageDiv) {
        console.error("Elementos essenciais da página de perfil não encontrados.");
        return;
    }

    const userInfo = getLoggedInUserInfo(); // Pega ID e Nome do usuário logado
    if (!userInfo || !userInfo.id) {
         console.error("Não foi possível obter informações do usuário logado.");
         messageDiv.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados do usuário. Faça login novamente.</div>`;
         return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const currentUser = users.find(u => u.id === userInfo.id);

    if (!currentUser) {
        console.error("Usuário logado não encontrado no localStorage pelo ID:", userInfo.id);
        messageDiv.innerHTML = `<div class="alert alert-danger">Erro crítico: Dados do usuário logado não encontrados.</div>`;
        // Talvez forçar logout aqui?
        // localStorage.clear(); window.location.href = 'index.html';
        return;
    }

    // Preenche o formulário com os dados atuais
    nameInput.value = currentUser.name || '';
    emailInput.value = currentUser.email || ''; // Email é readonly
    currentImageNameSpan.textContent = currentUser.imageUrl ? currentUser.imageUrl.split('/').pop() : 'Nenhuma';
    imagePreview.src = currentUser.imageUrl || 'img/placeholder-user.png';
    // Fallback para imagem padrão se a imagem salva não carregar
    imagePreview.onerror = () => { imagePreview.src = 'img/placeholder-user.png'; };

    // Listener para o envio do formulário
    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        event.stopPropagation();
        messageDiv.innerHTML = ''; // Limpa mensagens anteriores
        confirmPasswordInput.setCustomValidity(""); // Limpa validação customizada da senha
        newPasswordInput.setCustomValidity(""); // Limpa validação customizada da nova senha

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validação de senha (apenas se a nova senha foi preenchida)
        if (newPassword) {
            if (newPassword.length < 6) {
                newPasswordInput.setCustomValidity("A nova senha deve ter pelo menos 6 caracteres.");
                profileForm.classList.add('was-validated');
                newPasswordInput.reportValidity(); // Mostra o erro no campo
                return;
            }
            if (newPassword !== confirmPassword) {
                confirmPasswordInput.setCustomValidity("As senhas não coincidem.");
                profileForm.classList.add('was-validated');
                confirmPasswordInput.reportValidity(); // Mostra o erro no campo
                return;
            }
        }
        // Torna a confirmação obrigatória *apenas* se a nova senha foi digitada
        confirmPasswordInput.required = !!newPassword;

        // Validação geral do Bootstrap
        if (!profileForm.checkValidity()) {
            profileForm.classList.add('was-validated');
            return;
        }

        // Coleta os dados atualizados
        const updatedUserData = {
            id: currentUser.id,
            name: nameInput.value.trim(),
            // Envia a nova senha apenas se ela foi preenchida, senão undefined para não alterar
            password: newPassword ? newPassword : undefined,
            imageUrl: undefined // Será definido abaixo se houver nova imagem
        };

        // Simulação de upload de imagem
        const imageFile = imageInput.files[0];
        if (imageFile) {
            // Cria um nome de arquivo simulado baseado no nome do usuário e extensão original
            updatedUserData.imageUrl = `img/users/${formatImageName(updatedUserData.name)}.${imageFile.name.split('.').pop()}`;
            console.log("Nova imagem simulada:", updatedUserData.imageUrl);
        } else {
            // Mantém a imagem existente se nenhuma nova foi selecionada
            updatedUserData.imageUrl = currentUser.imageUrl;
        }

        // Chama a função para atualizar o usuário no localStorage
        if (updateUserProfile(updatedUserData)) {
            messageDiv.innerHTML = `<div class="alert alert-success">Perfil atualizado com sucesso!</div>`;
            profileForm.classList.remove('was-validated'); // Remove validação visual
            // Limpa campos de senha
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            confirmPasswordInput.required = false; // Reseta a obrigatoriedade
            // Atualiza a exibição da imagem
            currentImageNameSpan.textContent = updatedUserData.imageUrl ? updatedUserData.imageUrl.split('/').pop() : 'Nenhuma';
            imagePreview.src = updatedUserData.imageUrl || 'img/placeholder-user.png';
            // Atualiza o nome no header
            displayLoggedInUser();
        } else {
            // A função updateUserProfile deve retornar false e idealmente exibir a msg de erro
            // Se a mensagem já foi exibida por updateUserProfile, esta é redundante.
             if (!messageDiv.innerHTML) { // Exibe erro genérico se nenhum específico foi mostrado
                 messageDiv.innerHTML = `<div class="alert alert-danger">Erro ao atualizar o perfil. Tente novamente.</div>`;
             }
        }
    });
    //console.log("Lógica da página Meu Perfil inicializada.");
}

// --- Lógica da Página: Gerenciar Pedidos ---
function initializeOrdersPage() {
    const ordersTableBody = document.getElementById('orders-table-body');
    const receiptModalEl = document.getElementById('receiptModal');
    const dateFilterInput = document.getElementById('orderDateFilter');
    const categoryFilterSelect = document.getElementById('categoryFilter');
    const statusFilterSelect = document.getElementById('statusFilter');
    const filterBtn = document.getElementById('filterOrdersBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');

    //console.log("Iniciando initializeOrdersPage...");

    if (!ordersTableBody) {
        console.error("Elemento #orders-table-body não encontrado.");
        return; // Impede a execução do resto se a tabela não existe
    }
    if (!receiptModalEl) {
        console.warn("Elemento #receiptModal não encontrado nesta página.");
        // Pode continuar, mas funcionalidade de recibo não funcionará
    }
    if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
        console.error('Biblioteca Bootstrap Modal não está carregada.');
        return; // Impede a execução se o Bootstrap não estiver pronto
    }

    let receiptModal = receiptModalEl ? new bootstrap.Modal(receiptModalEl) : null;

    // Define a data de hoje como padrão no filtro
    if(dateFilterInput) {
         // Usar try-catch para evitar erro se o navegador não suportar valueAsDate
         try {
            dateFilterInput.valueAsDate = new Date();
         } catch (e) {
             const today = new Date();
             const yyyy = today.getFullYear();
             const mm = String(today.getMonth() + 1).padStart(2, '0'); // Janeiro é 0!
             const dd = String(today.getDate()).padStart(2, '0');
             dateFilterInput.value = `${yyyy}-${mm}-${dd}`;
         }
    }

    // Exibe a tabela de pedidos inicialmente (com filtros padrão, se houver)
    displayOrdersTable();

    // Listener para cliques na tabela (delegação de eventos)
    ordersTableBody.addEventListener('click', (event) => {
        const button = event.target.closest('button'); // Encontra o botão clicado, mesmo se clicar no ícone
        if (!button) return; // Sai se o clique não foi em um botão

        const orderId = button.dataset.orderId;

        // Lógica para botões de mudança de status
        if (button.classList.contains('status-change-btn')) {
            const newStatus = button.dataset.newStatus;
            //console.log(`Botão status-change clicado: OrderID=${orderId}, NewStatus=${newStatus}`);
            updateOrderStatus(orderId, newStatus);
        }
        // Lógica para botão de reverter status
        else if (button.classList.contains('revert-status-btn')) {
             //console.log(`Botão revert-status clicado: OrderID=${orderId}`);
            if (confirm(`Tem certeza que deseja reverter o status do pedido #${orderId.substring(orderId.length-5)} para "Solicitado"?`)) {
                updateOrderStatus(orderId, 'solicitado');
            }
        }
        // Adicionar outras ações se necessário (ex: visualizar detalhes, imprimir comanda)
    });

    // Adiciona listeners aos controles de filtro
    if(filterBtn) {
        filterBtn.addEventListener('click', displayOrdersTable);
    }
    if(clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            if(dateFilterInput) dateFilterInput.value = ''; // Limpa data
            if(categoryFilterSelect) categoryFilterSelect.value = ''; // Limpa categoria
            if(statusFilterSelect) statusFilterSelect.value = ''; // Limpa status
            console.log("Limpando filtros e atualizando tabela...");
            displayOrdersTable(); // Atualiza a tabela sem filtros
        });
    }
    // Atualiza a tabela automaticamente ao mudar filtros de select (opcional)
    if(categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', displayOrdersTable);
    }
    if(statusFilterSelect) {
        statusFilterSelect.addEventListener('change', displayOrdersTable);
    }
     // Atualiza a tabela automaticamente ao mudar data (opcional)
     if(dateFilterInput) {
         dateFilterInput.addEventListener('change', displayOrdersTable);
     }

    //console.log("Lógica da página Gerenciar Pedidos inicializada.");
}

// --- Lógica da Página: Gerenciar Pratos ---
function initializeDishesPage() {
    const dishesContainer = document.getElementById('dishes-list-container');
    const addDishForm = document.getElementById('addDishForm');
    const addDishModalEl = document.getElementById('addDishModal');
    const addDishButton = document.querySelector('button[data-bs-target="#addDishModal"]'); // Botão principal "Adicionar Prato"

    const userRole = getUserRole();

    if (!dishesContainer || !addDishForm || !addDishModalEl || !addDishButton) {
        console.error("Elementos essenciais da página Gerenciar Pratos não encontrados.");
        return;
    }
    if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
        console.error('Biblioteca Bootstrap Modal não está carregada.');
        return;
    }

    const addDishModal = new bootstrap.Modal(addDishModalEl);

    // --- Controle de Acesso ---
    if (userRole !== 'admin') {
        //console.log("Perfil não-admin detectado. Escondendo botão 'Adicionar Prato'.");
        addDishButton.style.display = 'none'; // Esconde o botão principal da página
        // As ações de editar/excluir serão tratadas dentro de displayDishes
    }

    // Exibe os pratos (a função displayDishes agora precisa saber o perfil)
    displayDishes(userRole);

    // Listener para ações nos cards de pratos (editar/excluir) - Só deve funcionar para admin
    dishesContainer.addEventListener('click', (event) => {
        if (userRole !== 'admin') return; // Ignora cliques se não for admin

        const button = event.target.closest('button');
        if (!button) return;

        const dishId = button.dataset.id;
        if (button.classList.contains('edit-dish-btn')) {
            editDish(dishId); // Função de editar (ainda placeholder)
        } else if (button.classList.contains('delete-dish-btn')) {
            deleteDish(dishId); // Função de excluir (placeholder)
        }
    });

    // Listener para o formulário de adicionar prato (só deve funcionar para admin, mas o botão já estaria escondido)
    addDishForm.addEventListener('submit', function(event){
        event.preventDefault();
        event.stopPropagation();

        // Checagem dupla de segurança (embora o modal não devesse ser acessível)
        if (userRole !== 'admin') {
            console.warn("Tentativa de adicionar prato por usuário não-admin bloqueada.");
            alert("Ação não permitida.");
            addDishModal.hide();
            return;
        }

        const messageDiv = document.getElementById('addDishForm-message');
        messageDiv.innerHTML = '';
        addDishForm.classList.add('was-validated');
        if (!addDishForm.checkValidity()) {
            return;
        }

        const name = document.getElementById('addDishName').value.trim();
        const description = document.getElementById('addDishDescription').value.trim();
        const price = parseFloat(document.getElementById('addDishPrice').value);
        const category = document.getElementById('addDishCategory').value;
        const imageFile = document.getElementById('addDishImage').files[0];

        // Cria nome de imagem formatado e URL simulada
        const imageName = formatImageName(name);
        // Define uma extensão padrão (ex: .jpg) se nenhuma imagem for selecionada
        const imageUrl = imageFile
            ? `img/dishes/${imageName}.${imageFile.name.split('.').pop()}`
            : `img/dishes/${imageName}.jpg`; // Ou deixe null/vazio se preferir

        const newDish = {
            id: 'd' + Date.now(), // ID único baseado no tempo
            name,
            description,
            price,
            category,
            imageUrl
        };

        if(addDish(newDish)) { // Tenta adicionar ao localStorage
            messageDiv.innerHTML = `<div class="alert alert-success">Prato "${name}" adicionado com sucesso!</div>`;
            addDishForm.reset();
            addDishForm.classList.remove('was-validated');
            displayDishes(userRole); // Atualiza a lista na página
            setTimeout(() => {
                addDishModal.hide();
                messageDiv.innerHTML = ''; // Limpa mensagem ao fechar
            }, 1500);
        } else {
            // addDish deve ter mostrado a mensagem de erro (ex: nome duplicado)
            // Apenas garante que o campo inválido (nome) seja marcado se o erro foi de duplicação
            const nameInput = document.getElementById('addDishName');
            if (nameInput && messageDiv.innerHTML.includes("nome")) { // Verifica se a msg é sobre nome
                 nameInput.classList.add('is-invalid');
            }
        }
    });

    // Limpa o formulário e validações quando o modal de adicionar é fechado
    addDishModalEl.addEventListener('hidden.bs.modal', () => {
        addDishForm.reset();
        addDishForm.classList.remove('was-validated');
        document.getElementById('addDishForm-message').innerHTML = '';
        // Remove a marcação de inválido do campo nome (se houver)
        const nameInput = document.getElementById('addDishName');
        if(nameInput) nameInput.classList.remove('is-invalid');
    });

    //console.log(`Lógica da página Gerenciar Pratos inicializada para perfil: ${userRole}.`);
}


// --- Lógica da Página: Gerenciar Mesas ---
function initializeTablesPage() {
    //console.log("Iniciando initializeTablesPage...");
    const tablesContainer = document.getElementById('tables-container');
    const addTableForm = document.getElementById('addTableForm');
    const addTableModalEl = document.getElementById('addTableModal');
    const orderModalEl = document.getElementById('orderModal');
    const receiptModalEl = document.getElementById('receiptModal');
    const occupyModalEl = document.getElementById('occupyTableModal');
    const addTableButton = document.querySelector('button[data-bs-target="#addTableModal"]'); // Botão principal "Adicionar Mesa"

    const userRole = getUserRole();

    // Verificações essenciais de elementos
    if (!tablesContainer || !addTableForm || !addTableModalEl || !orderModalEl || !receiptModalEl || !occupyModalEl || !addTableButton) {
        console.error("Elementos essenciais da página Gerenciar Mesas não encontrados.");
        return;
    }
    if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
        console.error('Biblioteca Bootstrap Modal não está carregada.');
        return;
    }

    // --- Controle de Acesso ---
    if (userRole !== 'admin') {
         //console.log("Perfil não-admin (Garçom) detectado. Escondendo botão 'Adicionar Mesa'.");
         addTableButton.style.display = 'none'; // Esconde o botão principal
    }

    // Instancia os modais
    let addTableModal, orderModal, receiptModal, occupyTableModal;
    try {
        addTableModal = new bootstrap.Modal(addTableModalEl);
        orderModal = new bootstrap.Modal(orderModalEl);
        receiptModal = new bootstrap.Modal(receiptModalEl);
        occupyTableModal = new bootstrap.Modal(occupyModalEl);
        //console.log("Modais da página de Mesas instanciados.");
    } catch (e) {
        console.error("Erro ao instanciar modais da página de Mesas:", e);
        return; // Não continua se os modais falharem
    }

    // Popula o select de pratos no modal de pedido
    try {
        populateDishSelect();
        //console.log("Select de pratos populado no modal de pedido.");
    } catch (e) {
        console.error("Erro ao popular select de pratos:", e);
    }

    // Exibe as mesas na tela
    try {
        displayTables();
        //console.log("Visualização inicial das mesas exibida.");
    } catch (e) {
        console.error("Erro ao chamar displayTables:", e);
    }

    // Listener para cliques nas mesas (delegação de eventos)
    tablesContainer.addEventListener('click', function(event) {
        const tableVisual = event.target.closest('.table-visual'); // Encontra o card da mesa clicado
        if (!tableVisual) return; // Ignora cliques fora dos cards

        const tableId = tableVisual.dataset.id;
        const tableNumber = tableVisual.dataset.number;
        const tableStatus = tableVisual.classList.contains('table-free') ? 'free' : 'occupied';

        //console.log(`Mesa clicada: ID=${tableId}, Número=${tableNumber}, Status=${tableStatus}`);

        if (tableStatus === 'free') {
            // Mesa Livre: Abre modal para ocupar
            document.getElementById('occupyTableId').value = tableId;
            document.getElementById('occupyTableNumber').textContent = tableNumber;
            document.getElementById('occupyTablePeople').value = 1; // Padrão 1 pessoa
            // Limpa validações/mensagens anteriores
            document.getElementById('occupyTablePeople').classList.remove('is-invalid');
            document.getElementById('occupyTableForm-message').innerHTML = '';
            occupyTableModal.show();
        } else if (tableStatus === 'occupied') {
            // Mesa Ocupada: Abre modal de pedido/conta
            openOrderModal(tableId, orderModal);
        }
    });

    // Listener para confirmar ocupação da mesa
    const confirmOccupyBtn = document.getElementById('confirmOccupyTableBtn');
    if (confirmOccupyBtn) {
        confirmOccupyBtn.addEventListener('click', () => {
            const tableId = document.getElementById('occupyTableId').value;
            const peopleInput = document.getElementById('occupyTablePeople');
            const peopleCount = parseInt(peopleInput.value, 10);
            const msgDiv = document.getElementById('occupyTableForm-message');
            msgDiv.innerHTML = ''; // Limpa mensagem anterior

            if(isNaN(peopleCount) || peopleCount < 1) {
                msgDiv.innerHTML = '<div class="alert alert-danger small p-2">Número de pessoas inválido.</div>';
                peopleInput.classList.add('is-invalid');
                return;
            }

            peopleInput.classList.remove('is-invalid');
            //console.log(`Confirmando ocupação: Mesa ID=${tableId}, Pessoas=${peopleCount}`);
            occupyTable(tableId, peopleCount); // Chama a função para ocupar
            occupyTableModal.hide(); // Fecha o modal
        });
    } else {
         console.error("Botão 'confirmOccupyTableBtn' não encontrado.");
    }

    // Listener para adicionar nova mesa (Apenas Admin)
    addTableForm.addEventListener('submit', function(event){
        event.preventDefault();
        event.stopPropagation();

        // Checagem de segurança (embora o botão principal esteja escondido para não-admins)
        if (userRole !== 'admin') {
             console.warn("Tentativa de adicionar mesa por usuário não-admin bloqueada.");
             alert("Ação não permitida.");
             addTableModal.hide();
             return;
        }

        const tableNumberInput = document.getElementById('addTableNumber');
        const messageDiv = document.getElementById('addTableForm-message');
        messageDiv.innerHTML = '';
        addTableForm.classList.add('was-validated');

        if (!addTableForm.checkValidity()) {
            return;
        }

        const tableNumber = parseInt(tableNumberInput.value, 10);

        if(addTable(tableNumber)) { // Tenta adicionar a mesa
            messageDiv.innerHTML = `<div class="alert alert-success">Mesa ${tableNumber} adicionada com sucesso!</div>`;
            addTableForm.reset();
            addTableForm.classList.remove('was-validated');
            displayTables(); // Atualiza a visualização das mesas
            setTimeout(() => {
                addTableModal.hide();
                messageDiv.innerHTML = '';
            }, 1500);
        } else {
            // addTable deve ter mostrado a mensagem de erro (número duplicado)
            tableNumberInput.classList.add('is-invalid'); // Marca o campo como inválido
        }
    });

    // Limpa formulário e validações ao fechar modal de adicionar mesa
    addTableModalEl.addEventListener('hidden.bs.modal', () => {
        addTableForm.reset();
        addTableForm.classList.remove('was-validated');
        document.getElementById('addTableForm-message').innerHTML = '';
        const tableNumberInput = document.getElementById('addTableNumber');
        if(tableNumberInput) tableNumberInput.classList.remove('is-invalid');
    });

    // --- Listeners do Modal de Pedido/Conta ---
    const addItemBtn = document.getElementById('addItemToTempListBtn');
    const sendOrderBtn = document.getElementById('sendOrderToKitchenBtn');
    const clearTableBtn = document.getElementById('clearTableAndOrderBtn'); // Botão Liberar Mesa
    const closeBillBtn = document.getElementById('closeTableBillBtn'); // Botão Gerar Conta
    const tempItemsList = document.getElementById('tempOrderItemsList'); // Lista de itens temporários

    if (addItemBtn) addItemBtn.addEventListener('click', addItemToTempList);
    if (sendOrderBtn) sendOrderBtn.addEventListener('click', sendOrderToKitchen);

    // Botão Liberar Mesa
    if (clearTableBtn) {
        clearTableBtn.addEventListener('click', function() {
            const tableId = document.getElementById('orderModalTableId').value;
            const tableNumber = document.getElementById('orderModalTableNumber').textContent;
            if (tableId) {
                 if(confirm(`LIBERAR MESA ${tableNumber}?\n\nATENÇÃO: Isso cancelará TODOS os pedidos (registrados no sistema) desta mesa e marcará a mesa como livre. Não adicionará valor ao faturamento.`)) {
                    console.log(`Confirmado: Liberar mesa ${tableNumber} (ID: ${tableId})`);
                    freeUpTable(tableId);
                    orderModal.hide();
                }
            } else {
                 console.error("ID da mesa não encontrado ao tentar liberar.");
            }
        });
    }

    // Botão Gerar Conta
    if (closeBillBtn) {
        closeBillBtn.addEventListener('click', function() {
            const tableId = document.getElementById('orderModalTableId').value;
            if (tableId && receiptModal) {
                 //console.log(`Gerando conta para mesa ID: ${tableId}`);
                openReceiptModal(tableId, receiptModal); // Abre o modal e TENTA adicionar ao faturamento diário
            } else {
                console.error("Erro ao tentar abrir recibo: ID da mesa ou instância do modal de recibo faltando.", {tableId, receiptModalExists: !!receiptModal});
                alert("Erro ao gerar a conta. Verifique o console.");
            }
        });
    }

    // Remover item da lista temporária
    if (tempItemsList) {
        tempItemsList.addEventListener('click', (event) => {
            const removeBtn = event.target.closest('.remove-temp-item-btn');
            if(removeBtn) {
                const dishId = removeBtn.dataset.dishId;
                const obs = removeBtn.dataset.observation; // Pega a observação do botão
                 //console.log(`Removendo item temporário: DishID=${dishId}, Obs='${obs}'`);
                removeItemFromTempList(dishId, obs);
            }
        });
    }

    // Limpeza ao fechar o modal de pedido
    orderModalEl.addEventListener('hidden.bs.modal', () => {
        //console.log("Modal de pedido fechado. Limpando dados temporários.");
        tempOrderItems = []; // Limpa array de itens temporários
        displayTempItems(); // Atualiza a exibição da lista vazia
        // Reseta campos do formulário de adicionar item
        document.getElementById('dishSelect').selectedIndex = 0;
        document.getElementById('itemQuantity').value = 1;
        document.getElementById('itemObservation').value = '';
        // Limpa a lista de pedidos anteriores e mensagens
        document.getElementById('ongoingOrdersList').innerHTML = '<p class="text-muted p-2">Carregando...</p>';
        document.getElementById('orderModal-message').innerHTML = '';
        // Limpa o ID da mesa no modal
        document.getElementById('orderModalTableId').value = '';
    });

    // --- Listeners do Modal de Recibo ---
    const taxCheckbox = document.getElementById('addServiceTaxCheck');
    if (taxCheckbox && receiptModalEl) {
        // Atualiza o recibo quando a taxa de serviço é marcada/desmarcada
        taxCheckbox.addEventListener('change', () => {
            const tableId = receiptModalEl.dataset.tableId; // Pega o ID da mesa do atributo data-* do modal
            if (tableId) {
                //console.log(`Taxa de serviço alterada para ${taxCheckbox.checked} na mesa ${tableId}. Regenerando recibo.`);
                const orders = JSON.parse(localStorage.getItem('orders') || '[]');
                const tables = JSON.parse(localStorage.getItem('tables') || '[]');
                const table = tables.find(t => t.id === tableId);
                // Filtra pedidos relevantes para a conta (não cancelados, etc.)
                const tableOrders = orders.filter(o => o.tableId === tableId && ['solicitado', 'preparacao', 'concluido'].includes(o.status));
                const receiptBody = document.getElementById('receiptModalBody');
                if (table && receiptBody) {
                    // Regenera o HTML do corpo do recibo
                    receiptBody.innerHTML = generateReceiptHtml(tableOrders, table.number, table.people || 1, taxCheckbox.checked);
                }
            }
        });

        // Guarda o tableId no modal quando ele é aberto
        receiptModalEl.addEventListener('show.bs.modal', event => {
            // Tenta pegar o ID da mesa do modal de pedido (se estiver aberto)
             const currentOrderModalTableId = document.getElementById('orderModalTableId')?.value;
             let tableIdToSet = '';

             if (currentOrderModalTableId) {
                 tableIdToSet = currentOrderModalTableId;
                 //console.log(`Abrindo recibo - ID da mesa ${tableIdToSet} obtido do modal de pedido.`);
             } else {
                 // Se o modal de pedido não estiver aberto (caso raro), tenta pegar do botão que abriu
                 const triggerButton = event.relatedTarget;
                 if (triggerButton && triggerButton.dataset.tableId) {
                     tableIdToSet = triggerButton.dataset.tableId;
                      //console.log(`Abrindo recibo - ID da mesa ${tableIdToSet} obtido do botão gatilho.`);
                 } else {
                     console.warn("Não foi possível obter o ID da mesa ao abrir o modal de recibo.");
                 }
             }
             receiptModalEl.dataset.tableId = tableIdToSet; // Armazena no atributo data-*
        });

        // Limpa o tableId e reseta a taxa ao fechar o modal de recibo
        receiptModalEl.addEventListener('hidden.bs.modal', () => {
             //console.log("Modal de recibo fechado.");
            delete receiptModalEl.dataset.tableId; // Remove o ID da mesa
            if (taxCheckbox) taxCheckbox.checked = true; // Reseta a taxa para marcada (padrão)
        });
    }

    // Botão Imprimir no modal de recibo
    const printBtn = receiptModalEl?.querySelector('.print-receipt-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            const receiptContent = document.getElementById('receiptModalBody');
            if (receiptContent) {
                //console.log("Tentando imprimir recibo...");
                const printWindow = window.open('', '_blank');
                printWindow.document.write('<html><head><title>Recibo</title>');
                // Estilos básicos para impressão (ajustar conforme necessário)
                printWindow.document.write(`
                    <style>
                        body { font-family: monospace; font-size: 10pt; margin: 20px; }
                        .receipt-item { display: flex; justify-content: space-between; margin-bottom: 2px; }
                        .receipt-item span:last-child { min-width: 60px; text-align: right; }
                        hr { border: 0; border-top: 1px dashed #888; margin: 5px 0; }
                        .receipt-total, .receipt-grand-total { border-top: 1px dashed #888; padding-top: 5px; margin-top: 5px; font-weight: bold; }
                        .text-center { text-align: center;}
                        .small { font-size: 0.8em;} .mb-1 { margin-bottom: 0.25rem;} .mb-2 { margin-bottom: 0.5rem;}
                        .mt-2 { margin-top: 0.5rem;} .ms-2 { margin-left: 0.5rem;} .d-block { display: block;}
                        .text-muted { color: #6c757d;} .fst-italic { font-style: italic;}
                        h6 {font-size: 1.1em; margin: 10px 0 5px 0; text-align: center;}
                        p { margin: 2px 0; }
                        .receipt-per-person { font-size: 0.85em; text-align: right; margin-top: 3px; }
                        .receipt-service-tax { font-size: 0.9em; }
                        @media print {
                            /* Esconder botões e outros elementos não desejados na impressão */
                            body * { visibility: hidden; }
                            #print-content, #print-content * { visibility: visible; }
                            #print-content { position: absolute; left: 0; top: 0; width: 100%; }
                            .no-print { display: none; }
                        }
                    </style>
                `);
                printWindow.document.write('</head><body>');
                // Adiciona um wrapper para facilitar a impressão seletiva se necessário
                printWindow.document.write('<div id="print-content">');
                printWindow.document.write(receiptContent.innerHTML);
                printWindow.document.write('</div>');
                printWindow.document.write('</body></html>');
                printWindow.document.close(); // Necessário para alguns navegadores
                printWindow.focus(); // Traz a janela de impressão para frente

                // Atraso para garantir que o conteúdo seja renderizado antes de imprimir
                setTimeout(() => {
                    try {
                        printWindow.print();
                        printWindow.close(); // Fecha a janela após a impressão (ou cancelamento)
                    } catch (e) {
                        console.error("Erro ao tentar imprimir:", e);
                        printWindow.close(); // Fecha mesmo se houver erro
                    }
                }, 300);
            } else {
                 console.error("Conteúdo do recibo (#receiptModalBody) não encontrado para impressão.");
            }
        });
    } else {
        console.warn("Botão de impressão não encontrado no modal de recibo.");
    }

    //console.log(`Lógica da página Gerenciar Mesas inicializada para perfil: ${userRole}.`);
}

// --- Lógica da Página: Gerenciar Usuários ---
function initializeManageUsersPage() {
    const userListBody = document.getElementById('user-list-body');
    const addUserForm = document.getElementById('addUserForm');
    const editUserForm = document.getElementById('editUserForm');
    const addUserModalEl = document.getElementById('addUserModal');
    const editUserModalEl = document.getElementById('editUserModal');

    // Perfil já verificado pelo checkAccess(), esta página só é acessível por Admin

    if (!userListBody || !addUserForm || !editUserForm || !addUserModalEl || !editUserModalEl) {
        console.error("Elementos essenciais da página Gerenciar Usuários não encontrados.");
        return;
    }
    if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
        console.error('Biblioteca Bootstrap Modal não está carregada.');
        return;
    }

    const addUserModal = new bootstrap.Modal(addUserModalEl);
    const editUserModal = new bootstrap.Modal(editUserModalEl);

    // Popula a tabela de usuários ao carregar a página
    populateUserTable();

    // Listener para botões de editar/excluir na tabela (delegação)
    userListBody.addEventListener('click', function(event) {
        const target = event.target.closest('button'); // Pega o botão, mesmo clicando no ícone
        if (!target) return; // Sai se não clicou em um botão

        const userId = target.dataset.userid;
        const isSelf = target.hasAttribute('data-is-self'); // Verifica se é o próprio usuário

        if (target.classList.contains('edit-user-btn')) {
            if (isSelf) {
                alert("Você não pode editar seu próprio usuário nesta tela. Use a opção 'Meu Perfil'.");
                return;
            }
             //console.log(`Botão Editar clicado para UserID: ${userId}`);
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userToEdit = users.find(u => u.id === userId);
            if (userToEdit) {
                // Preenche o modal de edição com os dados do usuário
                document.getElementById('editUserId').value = userToEdit.id;
                document.getElementById('editUserName').value = userToEdit.name;
                document.getElementById('editUserEmail').value = userToEdit.email;
                document.getElementById('editUserRole').value = userToEdit.role;
                // Limpa campos de senha e mensagens
                document.getElementById('editUserPassword').value = '';
                document.getElementById('editUserConfirmPassword').value = '';
                 document.getElementById('editUserPassword').setCustomValidity("");
                 document.getElementById('editUserConfirmPassword').setCustomValidity("");
                editUserForm.classList.remove('was-validated');
                document.getElementById('editUserForm-message').innerHTML = '';
                // Confirmação de senha só é obrigatória se a nova senha for digitada
                document.getElementById('editUserConfirmPassword').required = false;
                editUserModal.show();
            } else {
                console.error(`Usuário com ID ${userId} não encontrado para edição.`);
                alert("Erro: Usuário não encontrado.");
            }
        } else if (target.classList.contains('delete-user-btn')) {
             if (isSelf) {
                 alert("Você não pode excluir seu próprio usuário.");
                 return;
             }
              //console.log(`Botão Excluir clicado para UserID: ${userId}`);
            if (confirm(`Tem certeza que deseja excluir o usuário ID ${userId}?\nEsta ação não pode ser desfeita.`)) {
                 //console.log(`Confirmada exclusão do UserID: ${userId}`);
                deleteUser(userId); // Chama a função para remover do localStorage
            }
        }
    });

    // Listener para o formulário de adicionar usuário
    addUserForm.addEventListener('submit', function(event) {
        event.preventDefault();
        event.stopPropagation();

        const password = document.getElementById('addUserPassword').value;
        const confirm = document.getElementById('addUserConfirmPassword').value;
        const confirmInput = document.getElementById('addUserConfirmPassword');
        const messageDiv = document.getElementById('addUserForm-message');
        messageDiv.innerHTML = ''; // Limpa mensagens
        confirmInput.setCustomValidity(""); // Limpa validação customizada

        // Validação de senha
        if (password !== confirm) {
            confirmInput.setCustomValidity("As senhas não coincidem.");
            addUserForm.classList.add('was-validated');
            confirmInput.reportValidity(); // Mostra o erro
            return;
        }
        // Validação Bootstrap geral
        if (!addUserForm.checkValidity()) {
            addUserForm.classList.add('was-validated');
            return;
        }

        // Coleta dados do novo usuário
        const newUser = {
            id: 'u' + Date.now(), // ID único
            name: document.getElementById('addUserName').value.trim(),
            email: document.getElementById('addUserEmail').value.trim().toLowerCase(),
            role: document.getElementById('addUserRole').value,
            password: password, // Senha já validada
            imageUrl: null // Ou uma imagem padrão se desejar: 'img/placeholder-user.png'
        };

        if (addUser(newUser)) { // Tenta adicionar ao localStorage
            messageDiv.innerHTML = `<div class="alert alert-success">Usuário adicionado com sucesso!</div>`;
            addUserForm.reset();
            addUserForm.classList.remove('was-validated');
            populateUserTable(); // Atualiza a tabela na página
            setTimeout(() => {
                addUserModal.hide();
                messageDiv.innerHTML = ''; // Limpa mensagem ao fechar
            }, 1500);
        } else {
            // A função addUser() deve ter mostrado a mensagem de erro (email duplicado)
            // Marca o campo de email como inválido se o erro foi de duplicação
            const emailInput = document.getElementById('addUserEmail');
            if (emailInput && messageDiv.innerHTML.includes("Email")) { // Verifica se a msg é sobre email
                emailInput.classList.add('is-invalid');
            }
        }
    });

    // Listener para o formulário de editar usuário
    editUserForm.addEventListener('submit', function(event) {
        event.preventDefault();
        event.stopPropagation();

        const password = document.getElementById('editUserPassword').value;
        const confirm = document.getElementById('editUserConfirmPassword').value;
        const confirmInput = document.getElementById('editUserConfirmPassword');
        const newPasswordInput = document.getElementById('editUserPassword');
        const messageDiv = document.getElementById('editUserForm-message');
        messageDiv.innerHTML = ''; // Limpa mensagens
        confirmInput.setCustomValidity(""); // Limpa validação customizada
        newPasswordInput.setCustomValidity(""); // Limpa validação customizada

        // Validação de senha (APENAS se a nova senha foi digitada)
        confirmInput.required = !!password; // Obrigatório confirmar só se digitou nova senha
        if (password) { // Só valida se a nova senha não estiver vazia
             if (password.length < 6) {
                 newPasswordInput.setCustomValidity("A nova senha deve ter pelo menos 6 caracteres.");
                 editUserForm.classList.add('was-validated');
                 newPasswordInput.reportValidity();
                 return;
             }
            if (password !== confirm) {
                confirmInput.setCustomValidity("As senhas não coincidem.");
                editUserForm.classList.add('was-validated');
                confirmInput.reportValidity();
                return;
            }
        }


        // Validação Bootstrap geral
        if (!editUserForm.checkValidity()) {
            editUserForm.classList.add('was-validated');
            return;
        }

        // Coleta dados atualizados
        const updatedUser = {
            id: document.getElementById('editUserId').value,
            name: document.getElementById('editUserName').value.trim(),
            email: document.getElementById('editUserEmail').value.trim().toLowerCase(),
            role: document.getElementById('editUserRole').value,
            // Envia a nova senha apenas se foi preenchida, senão undefined para não alterar
            password: password || undefined
            // Mantém a imagem existente (não é editada aqui)
        };

        if (updateUser(updatedUser)) { // Tenta atualizar no localStorage
            messageDiv.innerHTML = `<div class="alert alert-success">Usuário atualizado com sucesso!</div>`;
            editUserForm.classList.remove('was-validated');
            populateUserTable(); // Atualiza a tabela
            setTimeout(() => {
                editUserModal.hide();
                messageDiv.innerHTML = ''; // Limpa mensagem ao fechar
            }, 1500);
        } else {
            // A função updateUser() deve ter mostrado a mensagem de erro (email duplicado)
            // Marca o campo de email como inválido se o erro foi esse
            const emailInput = document.getElementById('editUserEmail');
             if (emailInput && messageDiv.innerHTML.includes("Email")) {
                 emailInput.classList.add('is-invalid');
            }
        }
    });

    // Limpa formulários e validações ao fechar os modais
    addUserModalEl.addEventListener('hidden.bs.modal', () => {
        addUserForm.reset();
        addUserForm.classList.remove('was-validated');
        document.getElementById('addUserForm-message').innerHTML = '';
        const emailInput = document.getElementById('addUserEmail');
        if(emailInput) emailInput.classList.remove('is-invalid');
    });

    editUserModalEl.addEventListener('hidden.bs.modal', () => {
        editUserForm.reset();
        editUserForm.classList.remove('was-validated');
        document.getElementById('editUserForm-message').innerHTML = '';
        document.getElementById('editUserConfirmPassword').required = false; // Reseta obrigatoriedade
         document.getElementById('editUserPassword').setCustomValidity(""); // Limpa validação customizada
        const emailInput = document.getElementById('editUserEmail');
        if(emailInput) emailInput.classList.remove('is-invalid');
    });

    //console.log("Lógica da página Gerenciar Usuários inicializada.");
}

// --- Lógica da Página: Dashboard ---
function initializeDashboardPage() {
    const dashboardCards = document.getElementById('dashboard-cards');
    if (dashboardCards) {
        updateDashboardCards(); // Atualiza os contadores no dashboard (Mesas, Pedidos)
        updateFinancialReport(); // Atualiza o card de faturamento diário
    } else {
        console.warn("Container de cards do dashboard (#dashboard-cards) não encontrado.");
    }
    //console.log("Lógica da página Dashboard inicializada.");
}

// --- Lógica da Página: Login ---
function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        //console.log("Elemento #loginForm encontrado. Adicionando listener.");
        loginForm.addEventListener('submit', function(event) {
            //console.log("Evento submit do loginForm disparado.");
            event.preventDefault(); // Impede o envio padrão do formulário
            event.stopPropagation();

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const messageDiv = document.getElementById('form-message');

            if(messageDiv) messageDiv.innerHTML = ''; // Limpa mensagens anteriores
            loginForm.classList.remove('was-validated'); // Limpa validação anterior
            emailInput.classList.remove('is-invalid'); // Limpa estado inválido
            passwordInput.classList.remove('is-invalid'); // Limpa estado inválido

            // Aplica validação Bootstrap
            if (!loginForm.checkValidity()) {
                console.warn("Formulário de login inválido.");
                 loginForm.classList.add('was-validated'); // Mostra mensagens de erro padrão do HTML5
                // Adiciona feedback visual mais explícito se os campos estiverem vazios
                 if (!emailInput.value) emailInput.classList.add('is-invalid');
                 if (!passwordInput.value) passwordInput.classList.add('is-invalid');
                return;
            }

            //console.log("Formulário de login válido. Prosseguindo com a simulação.");
            const email = emailInput.value;
            const password = passwordInput.value;
            //console.log('Tentativa de Login Simulada:', { email, password: '***' }); // Não loga a senha

            // Busca o usuário no localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

            if (foundUser) {
                // Login bem-sucedido
                if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-success">Login bem-sucedido! Redirecionando...</div>`;
                console.log('Login simulado com sucesso para:', email, 'Role:', foundUser.role);
                // Armazena informações do usuário no localStorage
                localStorage.setItem('userEmail', foundUser.email);
                localStorage.setItem('userRole', foundUser.role);
                localStorage.setItem('userId', foundUser.id); // Guarda o ID também, útil para o perfil
                // Redireciona após um pequeno atraso para mostrar a mensagem
                setTimeout(() => {
                    // Redireciona para o dashboard (todos têm acesso)
                    window.location.href = 'admin_dashboard.html';
                }, 1000); // 1 segundo de atraso
            } else {
                // Login falhou
                if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Email ou senha inválidos.</div>`;
                console.log('Login simulado falhou.');
                 emailInput.classList.add('is-invalid'); // Marca campos como inválidos
                 passwordInput.classList.add('is-invalid');
                 loginForm.classList.add('was-validated'); // Garante que a validação visual apareça
                // Remove qualquer informação de usuário anterior
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userId');
            }
        });
        //console.log("Lógica da página Login inicializada.");
    } else {
         console.error("Formulário de login (#loginForm) não encontrado.");
    }
}

// --- Lógica da Página: Esqueci Senha ---
function initializeForgotPasswordPage() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        //console.log("Elemento #forgotPasswordForm encontrado. Adicionando listener.");
        forgotPasswordForm.addEventListener('submit', function(event) {
            //console.log("Evento submit do forgotPasswordForm disparado.");
            event.preventDefault();
            event.stopPropagation();

            const emailInput = document.getElementById('email');
            const messageDiv = document.getElementById('form-message');
            const submitButton = document.getElementById('submitForgotPassword');

            if(messageDiv) messageDiv.innerHTML = ''; // Limpa mensagens
            forgotPasswordForm.classList.remove('was-validated');
            emailInput.classList.remove('is-invalid');

            if (!forgotPasswordForm.checkValidity()) {
                console.warn("Formulário 'Esqueci Senha' inválido.");
                 forgotPasswordForm.classList.add('was-validated');
                 if (!emailInput.value) emailInput.classList.add('is-invalid');
                return;
            }

            const email = emailInput.value;
            //console.log('Solicitação de recuperação de senha simulada para:', email);

            // Simula o processo de envio
            if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-info">Processando solicitação...</div>`;
            if(submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
            }

            // Simula uma espera de rede
            setTimeout(() => {
                 // Exibe mensagem de sucesso (mesmo que o email não exista, por segurança)
                 if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-success">Se um email correspondente (${email}) for encontrado em nosso sistema, um link para redefinição de senha será enviado. Verifique sua caixa de entrada e spam.</div>`;

                 if(submitButton) {
                    submitButton.disabled = false; // Reabilita o botão
                    submitButton.innerHTML = 'Enviar Link de Recuperação';
                }
                 forgotPasswordForm.reset(); // Limpa o formulário
                 forgotPasswordForm.classList.remove('was-validated');
                //console.log('Simulação de envio de recuperação concluída.');
            }, 2000); // Simula 2 segundos de espera
        });
        //console.log("Lógica da página Esqueci Senha inicializada.");
    } else {
         console.error("Formulário de esqueci senha (#forgotPasswordForm) não encontrado.");
    }
}

// ========= FUNÇÕES AUXILIARES E CRUD (Incluindo Novas Financeiras) =========

// --- Funções CRUD Usuário ---
function populateUserTable() {
    const userListBody = document.getElementById('user-list-body');
    if (!userListBody) return;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const loggedInUserId = localStorage.getItem('userId'); // Pega o ID do usuário logado
    userListBody.innerHTML = ''; // Limpa a tabela

    if (users.length === 0) {
        userListBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário cadastrado.</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-user-id', user.id);

        // Mapeia role para texto exibido
        let roleText = 'Desconhecido';
        switch (user.role) {
            case 'admin': roleText = 'Administrador(a)'; break;
            case 'waiter': roleText = 'Garçom/Garçonete'; break;
            case 'kitchen': roleText = 'Cozinha'; break;
        }

        const isSelf = user.id === loggedInUserId; // Verifica se é o próprio usuário

        // Define atributos para desabilitar botões se for o próprio usuário
        const editButtonAttrs = isSelf
            ? 'disabled title="Use \'Meu Perfil\' para editar seus dados."'
            : 'title="Alterar dados do usuário"';
        const deleteButtonAttrs = isSelf
            ? 'disabled title="Você não pode excluir seu próprio usuário."'
            : 'title="Excluir usuário"';

        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${roleText}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-warning me-2 edit-user-btn" data-userid="${user.id}" ${isSelf ? 'data-is-self="true"' : ''} ${editButtonAttrs}>
                    <i class="bi bi-pencil-fill"></i> Alterar
                </button>
                <button class="btn btn-sm btn-danger delete-user-btn" data-userid="${user.id}" ${isSelf ? 'data-is-self="true"' : ''} ${deleteButtonAttrs}>
                    <i class="bi bi-trash-fill"></i> Excluir
                </button>
            </td>
        `;
        userListBody.appendChild(tr);
    });
     //console.log("Tabela de usuários populada.");
}

function addUser(newUser) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const messageDiv = document.getElementById('addUserForm-message'); // Div de mensagem no modal

    // Verifica se o email já existe
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
        console.error("Erro ao adicionar usuário: Email já cadastrado.", newUser.email);
        if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Erro: O email '${newUser.email}' já está cadastrado.</div>`;
        return false; // Indica falha
    }

    // Adiciona o novo usuário ao array
    users.push(newUser);
    // Salva o array atualizado no localStorage
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Novo usuário adicionado com sucesso:', newUser);
    return true; // Indica sucesso
}

function updateUser(updatedUser) {
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const messageDiv = document.getElementById('editUserForm-message'); // Div de mensagem no modal de edição

    const userIndex = users.findIndex(u => u.id === updatedUser.id);

    // Verifica se o usuário a ser editado existe
    if (userIndex === -1) {
        console.error("Erro ao atualizar usuário: Usuário não encontrado.", updatedUser.id);
        if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Erro: Usuário não encontrado no sistema.</div>`;
        return false;
    }

    // Verifica se o novo email já está em uso por OUTRO usuário
    if (users.some((u, index) => u.email.toLowerCase() === updatedUser.email.toLowerCase() && index !== userIndex)) {
        console.error("Erro ao atualizar usuário: Email já cadastrado por outro usuário.", updatedUser.email);
        if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Erro: O email '${updatedUser.email}' já pertence a outro usuário.</div>`;
        return false;
    }

    // Atualiza os dados do usuário existente
    const existingUser = users[userIndex];
    users[userIndex] = {
        ...existingUser, // Mantém dados não alterados (como ID, imageUrl se não editado aqui)
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        // Atualiza a senha APENAS se uma nova senha foi fornecida (updatedUser.password não é undefined)
        password: updatedUser.password !== undefined ? updatedUser.password : existingUser.password
        // A imagem não é atualizada nesta função, é tratada em updateUserProfile
    };

    // Salva o array atualizado
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Usuário atualizado com sucesso:', users[userIndex]);

     // Se o usuário atualizado for o logado, atualiza o nome no header
     if (localStorage.getItem('userId') === updatedUser.id) {
         displayLoggedInUser();
     }

    return true;
}


function deleteUser(userId) {
    //console.log(`Tentando excluir usuário ID: ${userId}`);
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const initialLength = users.length;

    // Filtra o array, mantendo todos os usuários EXCETO o que tem o ID correspondente
    users = users.filter(user => user.id !== userId);

    // Verifica se algum usuário foi removido
    if (users.length < initialLength) {
        localStorage.setItem('users', JSON.stringify(users));
        console.log(`Usuário ${userId} excluído com sucesso.`);
        // Atualiza a tabela na interface se estiver na página de gerenciamento
        if(document.getElementById('user-list-body')) {
             populateUserTable();
        }
        // Pode adicionar um feedback visual aqui, se desejado
         alert(`Usuário ${userId} foi excluído.`);
    } else {
        console.error(`Erro: Usuário ${userId} não encontrado para exclusão.`);
        alert(`Erro: Não foi possível encontrar o usuário ${userId} para excluir.`);
    }
}


// --- Funções CRUD Mesa ---
function displayTables() {
    const tablesContainer = document.getElementById('tables-container');
    if (!tablesContainer) {
         //console.error("Container de mesas (#tables-container) não encontrado.");
         return;
    }

    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    tablesContainer.innerHTML = ''; // Limpa o container

    if (tables.length === 0) {
        tablesContainer.innerHTML = '<p class="text-center col-12 text-muted fst-italic mt-4">Nenhuma mesa cadastrada.</p>';
        return;
    }

    // Ordena as mesas pelo número antes de exibir
    tables.sort((a, b) => a.number - b.number);

    tables.forEach(table => {
        const tableDiv = document.createElement('div');
        // Define as classes de coluna responsivas
        tableDiv.className = 'col-6 col-sm-4 col-md-3 col-lg-2 mb-3';

        const cardDiv = document.createElement('div');
        cardDiv.className = `table-visual ${table.status === 'free' ? 'table-free' : 'table-occupied'}`;
        cardDiv.dataset.id = table.id; // Armazena o ID da mesa
        cardDiv.dataset.number = table.number; // Armazena o número da mesa

        const numberSpan = document.createElement('span');
        numberSpan.className = 'table-number';
        numberSpan.textContent = table.number;

        const statusSpan = document.createElement('span');
        statusSpan.className = 'table-status-label';
        // Exibe o status e o número de pessoas se ocupada
        statusSpan.textContent = table.status === 'free' ? 'Livre' : `Ocupada (${table.people || '?'}p)`;

        cardDiv.appendChild(numberSpan);
        cardDiv.appendChild(statusSpan);
        tableDiv.appendChild(cardDiv);
        tablesContainer.appendChild(tableDiv);
    });
     //console.log('Visualização das mesas atualizada.');
}

function occupyTable(tableId, numberOfPeople) {
    let tables = JSON.parse(localStorage.getItem('tables') || '[]');
    const tableIndex = tables.findIndex(t => t.id === tableId);

    if (tableIndex !== -1 && tables[tableIndex].status === 'free') {
        tables[tableIndex].status = 'occupied';
        tables[tableIndex].people = numberOfPeople; // Armazena o número de pessoas
        localStorage.setItem('tables', JSON.stringify(tables));
        console.log(`Mesa ${tables[tableIndex].number} (ID: ${tableId}) marcada como OCUPADA por ${numberOfPeople} pessoa(s).`);
        displayTables(); // Atualiza a visualização na página de mesas
        updateDashboardCards(); // Atualiza os contadores no dashboard
    } else if (tableIndex !== -1) {
        console.log(`Tentativa de ocupar mesa ${tableId} falhou: Mesa já está ${tables[tableIndex].status}.`);
         alert(`A mesa ${tables[tableIndex].number} já está ocupada.`);
    } else {
        console.error(`Erro: Mesa ${tableId} não encontrada para ocupar.`);
         alert(`Erro: Mesa ${tableId} não encontrada.`);
    }
}

function freeUpTable(tableId) {
    let tables = JSON.parse(localStorage.getItem('tables') || '[]');
    let orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const tableIndex = tables.findIndex(t => t.id === tableId);

    if (tableIndex !== -1) {
        const tableNumber = tables[tableIndex].number;
        tables[tableIndex].status = 'free';
        tables[tableIndex].people = 0; // Zera o número de pessoas
        localStorage.setItem('tables', JSON.stringify(tables));
        console.log(`Mesa ${tableNumber} (ID: ${tableId}) marcada como LIVRE.`);

        // Remove TODOS os pedidos associados a esta mesa
        const initialOrderLength = orders.length;
        orders = orders.filter(order => order.tableId !== tableId);

        if (orders.length < initialOrderLength) {
            localStorage.setItem('orders', JSON.stringify(orders));
            console.log(`Todos os ${initialOrderLength - orders.length} pedido(s) da mesa ${tableId} foram removidos.`);
        } else {
            //console.log(`Nenhum pedido encontrado para a mesa ${tableId} para remover.`);
        }

        displayTables(); // Atualiza a visualização na página de mesas
        // Se estiver na página de pedidos, atualiza a tabela lá também
        if(document.getElementById('orders-table-body')) {
             displayOrdersTable();
        }
        updateDashboardCards(); // Atualiza os contadores no dashboard
        // ATENÇÃO: Liberar a mesa NÃO adiciona ao faturamento diário nesta lógica.
        // Apenas a geração da conta (openReceiptModal) faz isso.
    } else {
        console.error(`Erro: Mesa ${tableId} não encontrada para liberar.`);
         alert(`Erro: Mesa ${tableId} não encontrada.`);
    }
}


function addTable(tableNumber) {
    let tables = JSON.parse(localStorage.getItem('tables') || '[]');
    const messageDiv = document.getElementById('addTableForm-message'); // Div de mensagem no modal

    // Verifica se já existe uma mesa com esse número
    if (tables.some(t => t.number === tableNumber)) {
        console.error(`Erro ao adicionar mesa: Número ${tableNumber} já existe.`);
        if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Erro: Já existe uma mesa com o número ${tableNumber}.</div>`;
        return false; // Indica falha
    }
     // Verifica se o número é válido (maior que zero)
     if (tableNumber <= 0) {
          console.error(`Erro ao adicionar mesa: Número inválido (${tableNumber}).`);
          if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Erro: O número da mesa deve ser maior que zero.</div>`;
          return false; // Indica falha
     }

    // Cria o objeto da nova mesa
    const newTable = {
        id: 't' + Date.now(), // ID único baseado no tempo
        number: tableNumber,
        status: 'free', // Nova mesa sempre começa livre
        people: 0 // Número de pessoas inicial é 0
    };

    tables.push(newTable);
    localStorage.setItem('tables', JSON.stringify(tables));
    console.log('Nova mesa adicionada:', newTable);
    updateDashboardCards(); // Atualiza contagem no dashboard
    return true; // Indica sucesso
}


// --- Funções CRUD Prato ---
/**
 * Formata um nome para ser usado como parte de um nome de arquivo de imagem.
 * Converte para minúsculas, substitui espaços por underscores e remove caracteres não alfanuméricos (exceto underscore).
 * @param {string} name O nome original.
 * @returns {string} O nome formatado.
 */
function formatImageName(name) {
    if (!name) return 'imagem_padrao';
    return String(name) // Garante que é string
        .toLowerCase() // Converte para minúsculas
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/\s+/g, '_') // Substitui espaços (um ou mais) por underscore
        .replace(/[^a-z0-9_]/g, '') // Remove caracteres que não sejam letras minúsculas, números ou underscore
        .substring(0, 50); // Limita o tamanho para evitar nomes muito longos
}


/**
 * Exibe os pratos na página, agrupados por categoria.
 * Controla a visibilidade dos botões de ação com base no perfil do usuário.
 * @param {string} userRole O perfil do usuário logado ('admin', 'waiter', 'kitchen').
 */
function displayDishes(userRole) {
    const container = document.getElementById('dishes-list-container');
    if (!container) {
         //console.error("Container de pratos (#dishes-list-container) não encontrado.");
         return;
    }

    const dishes = JSON.parse(localStorage.getItem('dishes') || '[]');
    container.innerHTML = ''; // Limpa o container

    if (dishes.length === 0) {
        // Exibe um placeholder se não houver pratos
        container.innerHTML = `
            <div class="col-12 no-dishes-placeholder text-center mt-5">
                <i class="bi bi-journal-x display-1 text-muted"></i>
                <p class="mt-3 text-muted">Ainda não há pratos cadastrados.</p>
                ${userRole === 'admin' ? '<p class="text-muted">Use o botão "Adicionar Prato" para começar.</p>' : ''}
            </div>`;
        return;
    }

    // Agrupa pratos por categoria
    const groupedDishes = dishes.reduce((acc, dish) => {
        const category = dish.category || 'Outros'; // Agrupa pratos sem categoria em 'Outros'
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(dish);
        return acc;
    }, {});

    // Define a ordem desejada das categorias
    const categoryOrder = ["Entradas", "Saladas", "Massas", "Aves", "Carnes", "Peixes", "Sobremesas", "Bebidas", "Outros"];

    // Ordena as categorias encontradas de acordo com a ordem definida
    const sortedCategories = Object.keys(groupedDishes).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        // Coloca categorias não listadas (como 'Outros') no final
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    // Itera sobre as categorias ordenadas e cria a estrutura HTML
    sortedCategories.forEach(category => {
        const categoryHeader = document.createElement('h2');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category;
        container.appendChild(categoryHeader);

        const categoryRow = document.createElement('div');
        categoryRow.className = 'row g-3 align-items-stretch'; // g-3 para espaçamento, align-items-stretch para cards de mesma altura

        // Ordena os pratos dentro da categoria por nome
        groupedDishes[category].sort((a,b) => a.name.localeCompare(b.name)).forEach(dish => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-12 col-md-6 col-lg-4 col-xl-3 d-flex'; // Colunas responsivas, d-flex para align-items-stretch funcionar

             // --- Botões de Ação (Visíveis apenas para Admin) ---
             let actionButtonsHtml = '';
             if (userRole === 'admin') {
                 actionButtonsHtml = `
                     <div class="dish-actions">
                         <button class="btn btn-sm btn-outline-secondary edit-dish-btn" data-id="${dish.id}" title="Editar Prato (Não implementado)">
                             <i class="bi bi-pencil"></i> Editar
                         </button>
                         <button class="btn btn-sm btn-outline-danger delete-dish-btn" data-id="${dish.id}" title="Excluir Prato (Não implementado)">
                             <i class="bi bi-trash"></i> Excluir
                         </button>
                     </div>
                 `;
             }

            // --- Imagem do Prato com Fallback ---
            let imageHtml = '';
            const placeholderIcon = '<div class="dish-image-placeholder" style="display: flex;"><i class="bi bi-image-fill"></i></div>';
            if (dish.imageUrl && typeof dish.imageUrl === 'string' && dish.imageUrl.trim()) {
                // Tenta carregar a imagem. Se falhar (onerror), mostra o placeholder.
                imageHtml = `
                    <div class="dish-image-container">
                        <img src="${dish.imageUrl}" alt="${dish.name}" class="dish-image" loading="lazy"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="dish-image-placeholder" style="display: none;"><i class="bi bi-image-fill"></i></div>
                    </div>`;
            } else {
                // Se não há URL de imagem, mostra diretamente o placeholder.
                imageHtml = `<div class="dish-image-container">${placeholderIcon}</div>`;
            }

            // --- Card Completo ---
            const cardHtml = `
                <div class="dish-card h-100 d-flex flex-column"> <!-- h-100 e flex-column para ocupar altura e alinhar botões -->
                    ${imageHtml}
                    <div class="dish-details flex-grow-1"> <!-- flex-grow-1 para empurrar ações para baixo -->
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <span class="dish-name">${dish.name}</span>
                            <span class="dish-price">R$ ${dish.price.toFixed(2).replace('.',',')}</span>
                        </div>
                        <p class="dish-description">${dish.description || 'Sem descrição.'}</p>
                        <span class="dish-category mt-auto">${dish.category || 'Sem Categoria'}</span> <!-- mt-auto aqui não funciona bem com flex-grow, ajustado abaixo -->
                    </div>
                     ${actionButtonsHtml} <!-- Botões inseridos fora de dish-details -->
                </div>`;

            colDiv.innerHTML = cardHtml;
            categoryRow.appendChild(colDiv);
        });
        container.appendChild(categoryRow);
    });
     //console.log(`Visualização dos pratos atualizada para perfil: ${userRole}.`);
}


function addDish(newDish) {
    let dishes = JSON.parse(localStorage.getItem('dishes') || '[]');
    const messageDiv = document.getElementById('addDishForm-message');

    // Verifica se já existe um prato com o mesmo nome (case-insensitive)
    if (dishes.some(d => d.name.toLowerCase() === newDish.name.toLowerCase())) {
        console.warn(`Erro ao adicionar prato: Nome "${newDish.name}" já existe.`);
        if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Erro: Já existe um prato cadastrado com este nome.</div>`;
        return false; // Falha
    }
     // Validações adicionais podem ser feitas aqui (ex: preço > 0)
     if (newDish.price < 0) {
          console.warn(`Erro ao adicionar prato: Preço inválido (${newDish.price}).`);
          if(messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Erro: O preço do prato não pode ser negativo.</div>`;
          const priceInput = document.getElementById('addDishPrice');
          if (priceInput) priceInput.classList.add('is-invalid');
          return false;
     }

    dishes.push(newDish);
    localStorage.setItem('dishes', JSON.stringify(dishes));
    console.log('Novo prato adicionado com sucesso:', newDish);
    // Não precisa atualizar dashboard aqui, a menos que haja um card de "Total de Pratos"
    return true; // Sucesso
}


function editDish(dishId) {
    // Placeholder - Esta função precisa ser implementada
    // 1. Encontrar o prato pelo dishId no localStorage.
    // 2. Preencher um modal de *edição* (precisa ser criado no HTML) com os dados do prato.
    // 3. Salvar as alterações no localStorage quando o formulário de edição for enviado.
    // 4. Atualizar a exibição dos pratos na página (chamar displayDishes).
    console.log(`(Placeholder) Função editDish chamada para ID: ${dishId}`);
    alert(`Funcionalidade "Editar Prato ${dishId}" ainda não implementada.\nVocê precisaria de um novo modal e formulário de edição.`);
}


function deleteDish(dishId) {
    // Placeholder - Implementação básica
    //console.log(`Tentando excluir prato ID: ${dishId}`);
    if (confirm(`Tem certeza que deseja excluir o prato ID ${dishId}?\nEsta ação não pode ser desfeita.`)) {
        let dishes = JSON.parse(localStorage.getItem('dishes') || '[]');
        const initialLength = dishes.length;
        dishes = dishes.filter(d => d.id !== dishId);

        if (dishes.length < initialLength) {
            localStorage.setItem('dishes', JSON.stringify(dishes));
            console.log(`Prato ${dishId} excluído do localStorage.`);
            // Atualiza a visualização na página
            const userRole = getUserRole(); // Precisa saber o perfil para redesenhar corretamente
             if(document.getElementById('dishes-list-container')) {
                 displayDishes(userRole);
             }
            alert(`Prato ${dishId} foi excluído.`);
        } else {
            console.error(`Erro: Prato ${dishId} não encontrado para exclusão.`);
            alert(`Erro: Prato ${dishId} não encontrado.`);
        }
    } else {
         //console.log(`Exclusão do prato ${dishId} cancelada.`);
    }
}


// --- Funções de Pedido ---
function populateDishSelect() {
    const select = document.getElementById('dishSelect');
    if (!select) {
         //console.error("Elemento select de pratos (#dishSelect) não encontrado no modal de pedido.");
         return;
    }

    const dishes = JSON.parse(localStorage.getItem('dishes') || '[]');
    select.innerHTML = '<option selected disabled value="">Selecione um item...</option>'; // Opção padrão

    if (dishes.length > 0) {
        // Agrupa por categoria para <optgroup>
        const groupedDishes = dishes.reduce((acc, dish) => {
            const category = dish.category || 'Outros';
            if (!acc[category]) acc[category] = [];
            acc[category].push(dish);
            return acc;
        }, {});

        // Ordena categorias
        const categoryOrder = ["Entradas", "Saladas", "Massas", "Aves", "Carnes", "Peixes", "Bebidas", "Sobremesas", "Outros"];
        const sortedCategories = Object.keys(groupedDishes).sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        // Cria os <optgroup> e <option>
        sortedCategories.forEach(category => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            // Ordena pratos dentro da categoria
            groupedDishes[category].sort((a,b) => a.name.localeCompare(b.name)).forEach(dish => {
                const option = document.createElement('option');
                option.value = dish.id; // Valor é o ID do prato
                option.textContent = `${dish.name} (R$ ${dish.price.toFixed(2).replace('.', ',')})`;
                // Armazena dados extras na opção para fácil acesso
                option.dataset.price = dish.price;
                option.dataset.name = dish.name;
                option.dataset.category = dish.category || 'Outros'; // Guarda a categoria
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        });
    } else {
        // Caso não haja pratos cadastrados
        select.innerHTML = '<option disabled>Nenhum prato cadastrado</option>';
        select.disabled = true; // Desabilita o select
    }
     //console.log("Select de pratos populado.");
}


function openOrderModal(tableId, orderModalInstance) {
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    const table = tables.find(t => t.id === tableId);

    if (table) {
        // Preenche informações da mesa no modal
        document.getElementById('orderModalTableNumber').textContent = table.number;
        document.getElementById('orderModalPeopleCount').textContent = table.people || '?';
        document.getElementById('orderModalTableId').value = table.id; // Guarda o ID da mesa no modal
        document.getElementById('orderModal-message').innerHTML = ''; // Limpa mensagens

        // Reseta a lista de itens temporários
        tempOrderItems = [];
        displayTempItems(); // Mostra a lista (vazia inicialmente)

        // Carrega e exibe os pedidos já existentes para esta mesa
        displayOngoingOrders(tableId);

        // Abre o modal
        orderModalInstance.show();
         //console.log(`Modal de pedido aberto para Mesa ${table.number} (ID: ${tableId})`);
    } else {
        console.error("Erro ao abrir modal de pedido: Mesa não encontrada.", tableId);
        alert("Erro: Mesa não encontrada.");
    }
}


function addItemToTempList() {
    const dishSelect = document.getElementById('dishSelect');
    const quantityInput = document.getElementById('itemQuantity');
    const observationInput = document.getElementById('itemObservation');
    const messageDiv = document.getElementById('orderModal-message');
    messageDiv.innerHTML = ''; // Limpa mensagens anteriores

    const dishId = dishSelect.value;
    const quantity = parseInt(quantityInput.value, 10);
    const observation = observationInput.value.trim();

    // Validações
    if (!dishId) {
        messageDiv.innerHTML = `<div class="alert alert-warning small p-2">Por favor, selecione um item.</div>`;
        dishSelect.focus();
        return;
    }
    if (isNaN(quantity) || quantity < 1) {
        messageDiv.innerHTML = `<div class="alert alert-warning small p-2">Quantidade inválida. Deve ser 1 ou mais.</div>`;
        quantityInput.focus();
        quantityInput.select();
        return;
    }
     // Limite máximo de quantidade (opcional)
     const MAX_QUANTITY = 99;
     if (quantity > MAX_QUANTITY) {
         messageDiv.innerHTML = `<div class="alert alert-warning small p-2">Quantidade máxima por item é ${MAX_QUANTITY}.</div>`;
         quantityInput.focus();
         quantityInput.select();
         return;
     }


    // Obtém dados do prato selecionado
    const selectedOption = dishSelect.options[dishSelect.selectedIndex];
    const dishName = selectedOption.dataset.name;
    const dishPrice = parseFloat(selectedOption.dataset.price);
    // Pega a categoria do <optgroup> ou do dataset da option
    const dishCategory = selectedOption.closest('optgroup')?.label || selectedOption.dataset.category || 'Outros';

    // Verifica se já existe um item IGUAL (mesmo ID e mesma observação) na lista temporária
    const existingIndex = tempOrderItems.findIndex(item => item.dishId === dishId && item.observation === observation);

    if (existingIndex > -1) {
        // Se existe, apenas incrementa a quantidade
        tempOrderItems[existingIndex].quantity += quantity;
         //console.log(`Quantidade incrementada para item existente: ${dishName} (Obs: ${observation || 'Nenhuma'})`);
    } else {
        // Se não existe, adiciona como novo item
        tempOrderItems.push({
            dishId,
            name: dishName,
            price: dishPrice,
            quantity,
            observation,
            category: dishCategory // Guarda a categoria
        });
         //console.log(`Novo item adicionado à lista temporária: ${quantity}x ${dishName} (Obs: ${observation || 'Nenhuma'})`);
    }

    // Atualiza a exibição da lista de itens temporários
    displayTempItems();

    // Reseta os campos do formulário para adicionar o próximo item
    dishSelect.selectedIndex = 0; // Volta para "Selecione..."
    quantityInput.value = 1;
    observationInput.value = '';
    dishSelect.focus(); // Foca no select para facilitar adição rápida
}


function displayTempItems() {
    const listContainer = document.getElementById('tempOrderItemsList');
    const sendButton = document.getElementById('sendOrderToKitchenBtn');

    if (!listContainer || !sendButton) {
         //console.error("Elementos da lista de itens temporários ou botão de envio não encontrados.");
         return;
    }

    listContainer.innerHTML = ''; // Limpa a lista

    if (tempOrderItems.length === 0) {
        listContainer.innerHTML = '<p class="list-group-item text-muted text-center small p-2">Nenhum item novo adicionado.</p>';
        sendButton.disabled = true; // Desabilita o botão de enviar se não há itens
        return;
    }

    // Cria um elemento para cada item na lista temporária
    tempOrderItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'list-group-item d-flex justify-content-between align-items-center flex-wrap py-1'; // flex-wrap para observação quebrar linha

        // Inclui a observação se existir
        const observationHtml = item.observation
            ? `<small class="w-100 text-muted fst-italic ms-1">- Obs: ${sanitizeHTML(item.observation)}</small>` // Sanitiza observação
            : '';

        itemElement.innerHTML = `
            <div class="flex-grow-1 me-2">
                <span class="item-name fw-bold">${item.quantity}x</span> ${sanitizeHTML(item.name)}
                ${observationHtml}
            </div>
            <span class="item-total-price fw-bold me-2">R$ ${(item.quantity * item.price).toFixed(2).replace('.', ',')}</span>
            <button class="btn btn-sm btn-outline-danger remove-temp-item-btn p-0 px-1 border-0"
                    data-dish-id="${item.dishId}"
                    data-observation="${sanitizeAttribute(item.observation || '')}"
                    title="Remover este item da lista">
                <i class="bi bi-x-lg"></i>
            </button>
        `;
        listContainer.appendChild(itemElement);
    });

    sendButton.disabled = false; // Habilita o botão de enviar
     //console.log("Lista de itens temporários atualizada.");
}


/**
 * Remove um item específico da lista temporária.
 * A combinação de dishId e observation identifica unicamente o item a ser removido.
 * @param {string} dishId ID do prato a remover.
 * @param {string} observation Observação associada ao item (pode ser string vazia).
 */
function removeItemFromTempList(dishId, observation = '') {
     //console.log(`Removendo item da lista temporária: DishID=${dishId}, Observation='${observation}'`);
    const initialLength = tempOrderItems.length;
    // Filtra a lista, mantendo apenas os itens que NÃO correspondem exatamente ao ID e observação
    tempOrderItems = tempOrderItems.filter(item =>
        !(item.dishId === dishId && (item.observation || '') === (observation || ''))
    );

    if (tempOrderItems.length < initialLength) {
        //console.log("Item removido com sucesso.");
        displayTempItems(); // Atualiza a exibição da lista
    } else {
         console.warn("Item não encontrado na lista temporária para remoção.");
    }
}


function sendOrderToKitchen() {
    const tableId = document.getElementById('orderModalTableId').value;
    const messageDiv = document.getElementById('orderModal-message');
    messageDiv.innerHTML = ''; // Limpa mensagens

    if (!tableId) {
        messageDiv.innerHTML = `<div class="alert alert-danger small p-2">Erro interno: ID da mesa não encontrado. Recarregue a página.</div>`;
        console.error("ID da mesa não encontrado ao tentar enviar pedido.");
        return;
    }
    if (tempOrderItems.length === 0) {
        messageDiv.innerHTML = `<div class="alert alert-warning small p-2">Nenhum item novo na lista para enviar.</div>`;
        console.warn("Tentativa de enviar pedido sem itens na lista temporária.");
        return;
    }

    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    const table = tables.find(t => t.id === tableId);
    const userInfo = getLoggedInUserInfo(); // Pega ID e nome do usuário logado

    if (!userInfo || !userInfo.id) {
         messageDiv.innerHTML = `<div class="alert alert-danger small p-2">Erro: Não foi possível identificar o usuário. Faça login novamente.</div>`;
         console.error("Informações do usuário logado não encontradas ao enviar pedido.");
         return;
    }

    let orders = JSON.parse(localStorage.getItem('orders') || '[]');

    // Cria o novo objeto de pedido
    const newOrder = {
        orderId: 'o' + Date.now(), // ID único do pedido
        tableId: tableId,
        tableNumber: table ? table.number : '?', // Número da mesa (fallback para '?')
        items: [...tempOrderItems], // Copia os itens da lista temporária
        status: 'solicitado', // Status inicial
        createdAt: new Date().toISOString(), // Data/hora de criação
        updatedAt: new Date().toISOString(), // Data/hora da última atualização (inicialmente igual à criação)
        createdByUserId: userInfo.id, // ID do usuário que criou
        createdByUserName: userInfo.name // Nome do usuário que criou
    };

    // Adiciona o novo pedido ao array de pedidos
    orders.push(newOrder);
    // Salva o array atualizado no localStorage
    localStorage.setItem('orders', JSON.stringify(orders));

    console.log(`Novo pedido ${newOrder.orderId} enviado para Mesa ${tableId} por ${userInfo.name}`);

    // Limpa a lista temporária e atualiza a interface
    tempOrderItems = [];
    displayTempItems(); // Limpa a seção de itens novos
    displayOngoingOrders(tableId); // Atualiza a seção de histórico

    // Atualiza outras partes da interface se necessário
    if(document.getElementById('orders-table-body')) {
         displayOrdersTable(); // Atualiza a tabela na página de Gerenciar Pedidos
    }
    updateDashboardCards(); // Atualiza os contadores do dashboard (pedidos pendentes)
    // O faturamento NÃO é atualizado aqui, apenas na geração da conta.

    // Exibe mensagem de sucesso no modal
    messageDiv.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show small p-2" role="alert">
            Pedido enviado com sucesso!
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
}


/**
 * Exibe o histórico de pedidos para uma mesa específica dentro do modal de pedido.
 * Usa um accordion para organizar os pedidos.
 * @param {string} tableId O ID da mesa.
 */
function displayOngoingOrders(tableId) {
    const listContainer = document.getElementById('ongoingOrdersList');
    if (!listContainer) {
        //console.error("Container do histórico de pedidos (#ongoingOrdersList) não encontrado.");
        return;
    }

    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    // Filtra pedidos da mesa específica e ordena do mais recente para o mais antigo
    const tableOrders = orders
        .filter(o => o.tableId === tableId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    listContainer.innerHTML = ''; // Limpa o container

    if (tableOrders.length === 0) {
        listContainer.innerHTML = '<p class="text-muted p-2 text-center fst-italic">Nenhum pedido registrado para esta mesa ainda.</p>';
        return;
    }

    // Cria um item no accordion para cada pedido
    tableOrders.forEach((order, index) => {
        const accordionId = `order-${order.orderId}`;
        // Formata a lista de itens do pedido
        const itemsHtml = order.items.map(item =>
            `<li>
                ${item.quantity}x ${sanitizeHTML(item.name)}
                ${item.observation ? `<i class='text-muted small d-block ms-2'>- Obs: ${sanitizeHTML(item.observation)}</i>` : ''}
             </li>`
        ).join('');

        const statusBadge = createStatusBadge(order.status); // Cria o badge de status
        const createdDate = new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        // Define se o accordion começa colapsado (ex: pedidos concluídos)
        const isCollapsed = order.status === 'concluido';
        // Define se o accordion começa expandido (ex: não concluídos)
        const isExpanded = !isCollapsed;

        // Cria o HTML do item do accordion
        const accordionItem = `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading-${accordionId}">
                    <button class="accordion-button ${isCollapsed ? 'collapsed' : ''}" type="button"
                            data-bs-toggle="collapse" data-bs-target="#collapse-${accordionId}"
                            aria-expanded="${isExpanded}" aria-controls="collapse-${accordionId}">
                        Pedido #${order.orderId.substring(order.orderId.length - 5)} <!-- Últimos 5 dígitos do ID -->
                        <span class="mx-2 text-muted small">(${createdDate})</span>
                        ${statusBadge}
                    </button>
                </h2>
                <div id="collapse-${accordionId}" class="accordion-collapse collapse ${isExpanded ? 'show' : ''}"
                     aria-labelledby="heading-${accordionId}" data-bs-parent="#ongoingOrdersList">
                    <div class="accordion-body">
                        <small class="d-block mb-2"><strong>Enviado por:</strong> ${sanitizeHTML(order.createdByUserName || 'N/A')}</small>
                        <ul class="list-unstyled mb-0">
                            ${itemsHtml || '<li>Nenhum item neste pedido.</li>'}
                        </ul>
                        <!-- Adicionar botões de ação aqui se necessário (ex: reimprimir comanda) -->
                    </div>
                </div>
            </div>`;

        listContainer.innerHTML += accordionItem; // Adiciona o item ao container
    });
     //console.log(`Histórico de pedidos exibido para mesa ${tableId}.`);
}


// --- Funções da Página de Pedidos ---
/**
 * Exibe os pedidos na tabela da página Gerenciar Pedidos, aplicando filtros.
 */
function displayOrdersTable() {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) {
        //console.error("Corpo da tabela de pedidos (#orders-table-body) não encontrado.");
        return;
    }

    // Obtém os valores dos filtros
    const dateFilterInput = document.getElementById('orderDateFilter');
    const categoryFilterSelect = document.getElementById('categoryFilter');
    const statusFilterSelect = document.getElementById('statusFilter');

    const filterDate = dateFilterInput ? dateFilterInput.value : null;
    const filterCategory = categoryFilterSelect ? categoryFilterSelect.value : '';
    const filterStatus = statusFilterSelect ? statusFilterSelect.value : '';

    //console.log("Aplicando filtros:", { filterDate, filterCategory, filterStatus });

    let orders = JSON.parse(localStorage.getItem('orders') || '[]');
    tableBody.innerHTML = ''; // Limpa a tabela

    // Aplica os filtros
    let filteredOrders = orders;
    if (filterDate) {
        // Compara apenas a parte da data (YYYY-MM-DD)
        filteredOrders = filteredOrders.filter(order => {
             try {
                 return new Date(order.createdAt).toISOString().slice(0, 10) === filterDate;
             } catch (e) {
                 console.warn(`Data inválida no pedido ${order.orderId}: ${order.createdAt}`);
                 return false; // Ignora pedidos com data inválida
             }
        });
    }
    if (filterCategory) {
        filteredOrders = filteredOrders.filter(order =>
            order.items.some(item => item.category === filterCategory)
        );
    }
    if (filterStatus) {
        filteredOrders = filteredOrders.filter(order => order.status === filterStatus);
    }

    // Verifica se há pedidos após filtrar
    if (filteredOrders.length === 0) {
        let msg = 'Nenhum pedido encontrado';
        if (filterDate || filterCategory || filterStatus) {
            msg += ' para os filtros selecionados.';
        } else {
            msg += '.';
        }
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-muted fst-italic">${msg}</td></tr>`;
        return;
    }

    // Ordena os pedidos filtrados (mais recentes primeiro)
    filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Cria as linhas da tabela para cada pedido
    filteredOrders.forEach(order => {
        const tr = document.createElement('tr');
        const total = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const createdDate = new Date(order.createdAt).toLocaleString('pt-BR');
        const statusBadge = createStatusBadge(order.status);

        // Formata a lista de itens e observações
        const itemsSummary = order.items.map(i =>
            `${i.quantity}x ${sanitizeHTML(i.name)}` +
            (i.observation ? ` <i class='bi bi-dot text-muted'></i> <small class='text-muted fst-italic'>(${sanitizeHTML(i.observation)})</small>` : '')
        ).join('<br>');

        // Define os botões de ação com base no status
        let actionButtons = '';
        if (order.status === 'solicitado') {
            actionButtons = `
                <button class="btn btn-sm btn-warning status-change-btn" data-order-id="${order.orderId}" data-new-status="preparacao" title="Marcar como Em Preparação">
                    <i class="bi bi-arrow-right-circle"></i> Preparar
                </button>`;
        } else if (order.status === 'preparacao') {
            actionButtons = `
                <button class="btn btn-sm btn-secondary revert-status-btn me-1" data-order-id="${order.orderId}" title="Reverter para Solicitado">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button class="btn btn-sm btn-success status-change-btn" data-order-id="${order.orderId}" data-new-status="concluido" title="Marcar como Concluído">
                    <i class="bi bi-check-circle"></i> Concluir
                </button>`;
        } else if (order.status === 'concluido') {
            // Para concluído, pode mostrar um texto ou nenhum botão
            actionButtons = `<span class="text-success fw-bold"><i class="bi bi-check-all"></i> Concluído</span>`;
        }
        // Adicionar status 'cancelado' se existir

        tr.innerHTML = `
            <td>#${order.orderId.substring(order.orderId.length - 5)}</td> <!-- ID Curto -->
            <td>${order.tableNumber}</td>
            <td>${statusBadge}</td>
            <td>${sanitizeHTML(order.createdByUserName || 'Desconhecido')}</td>
            <td>${itemsSummary || '<i class="text-muted">Vazio</i>'}</td>
            <td class="text-end fw-bold">R$ ${total.toFixed(2).replace('.', ',')}</td>
            <td>${createdDate}</td>
            <td class="text-center">
                <div class="btn-group btn-group-sm" role="group">
                    ${actionButtons}
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    //console.log(`Tabela de pedidos exibida (${filteredOrders.length} de ${orders.length} pedidos).`);
}


/**
 * Cria o HTML para um badge de status de pedido.
 * @param {string} status O status do pedido ('solicitado', 'preparacao', 'concluido', etc.).
 * @returns {string} O HTML do span do badge.
 */
function createStatusBadge(status) {
    let badgeClass = 'bg-secondary'; // Cor padrão
    let statusText = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Desconhecido'; // Texto padrão

    switch (status) {
        case 'solicitado':
            badgeClass = 'badge-status-solicitado'; // Classe CSS para vermelho
            statusText = 'Solicitado';
            break;
        case 'preparacao':
            badgeClass = 'badge-status-preparacao'; // Classe CSS para amarelo
            statusText = 'Em Preparação';
            break;
        case 'concluido':
            badgeClass = 'badge-status-concluido'; // Classe CSS para verde
            statusText = 'Concluído';
            break;
        case 'closed': // Exemplo de outros status
        case 'paid':
            badgeClass = 'bg-dark';
            statusText = 'Fechado/Pago';
            break;
        case 'cancelled':
             badgeClass = 'bg-danger text-white';
             statusText = 'Cancelado';
             break;
    }

    return `<span class="badge badge-status ${badgeClass}">${statusText}</span>`;
}


/**
 * Atualiza o status de um pedido no localStorage.
 * @param {string} orderId O ID do pedido a ser atualizado.
 * @param {string} newStatus O novo status ('solicitado', 'preparacao', 'concluido').
 */
function updateOrderStatus(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const orderIndex = orders.findIndex(o => o.orderId === orderId);

    if (orderIndex !== -1) {
        const currentStatus = orders[orderIndex].status;
         //console.log(`Atualizando status do pedido ${orderId} de ${currentStatus} para ${newStatus}`);

        // Adicionar validações de fluxo se necessário (ex: não pode voltar de concluído)
        const allowedTransitions = {
             solicitado: ['preparacao', 'cancelled'], // De solicitado só pode ir para preparação ou cancelado
             preparacao: ['solicitado', 'concluido', 'cancelled'], // De preparação pode voltar, avançar ou cancelar
             concluido: [], // De concluído não pode mudar (exceto talvez cancelamento especial?)
             cancelled: [] // De cancelado não pode mudar
        };

         // Verifica se a transição é permitida (se a regra existir para o status atual)
         if (allowedTransitions[currentStatus] && !allowedTransitions[currentStatus].includes(newStatus)) {
              console.warn(`Mudança de status inválida: de '${currentStatus}' para '${newStatus}' não permitida.`);
              alert(`Não é possível alterar o status de "${currentStatus}" para "${newStatus}".`);
              return; // Interrompe a função
         }


        orders[orderIndex].status = newStatus;
        orders[orderIndex].updatedAt = new Date().toISOString(); // Atualiza data da modificação
        localStorage.setItem('orders', JSON.stringify(orders));
        console.log(`Status do pedido ${orderId} atualizado para ${newStatus} no localStorage.`);

        // Atualiza a interface
        if (document.getElementById('orders-table-body')) {
            displayOrdersTable(); // Atualiza a tabela na página de Gerenciar Pedidos
        }
        if (document.getElementById('ongoingOrdersList') && document.getElementById('orderModalTableId')?.value === orders[orderIndex].tableId) {
             displayOngoingOrders(orders[orderIndex].tableId); // Atualiza o histórico no modal se ele estiver aberto para essa mesa
        }
        updateDashboardCards(); // Atualiza contadores no dashboard

    } else {
        console.error(`Erro: Pedido ${orderId} não encontrado para atualizar status.`);
         alert(`Erro: Pedido ${orderId} não encontrado.`);
    }
}


/**
 * Abre o modal de recibo/conta para uma mesa específica E TENTA ATUALIZAR O FATURAMENTO DIÁRIO.
 * @param {string} tableId O ID da mesa.
 * @param {object} receiptModalInstance A instância do modal Bootstrap.
 */
function openReceiptModal(tableId, receiptModalInstance) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    const table = tables.find(t => t.id === tableId);

    // Elementos do modal de recibo
    const receiptBody = document.getElementById('receiptModalBody');
    const receiptTableNumber = document.getElementById('receiptTableNumber');
    const taxCheckbox = document.getElementById('addServiceTaxCheck');

    // Verifica se tudo necessário existe
    if (table && receiptBody && receiptTableNumber && receiptModalInstance && taxCheckbox) {
        // Filtra os pedidos relevantes para a conta (não cancelados, etc.)
        const relevantStatuses = ['solicitado', 'preparacao', 'concluido'];
        const tableOrders = orders.filter(o => o.tableId === tableId && relevantStatuses.includes(o.status));

        // Define o número da mesa no título do modal
        receiptTableNumber.textContent = table.number;

        // Gera o HTML inicial do recibo (com taxa marcada por padrão)
        const includeTaxDefault = taxCheckbox.checked;
        receiptBody.innerHTML = generateReceiptHtml(tableOrders, table.number, table.people || 1, includeTaxDefault);

        // Armazena o ID da mesa no dataset do modal para referência posterior (ex: ao mudar a taxa)
        receiptModalInstance._element.dataset.tableId = tableId;

        // --- Lógica para adicionar ao Faturamento Diário ---
        const dailyTotalKey = getDailyTotalKey();
        const billedTablesKey = getBilledTablesKey();

        let dailyTotal = parseFloat(localStorage.getItem(dailyTotalKey) || '0');
        let billedTablesToday = JSON.parse(localStorage.getItem(billedTablesKey) || '[]');

        // Verifica se esta mesa JÁ foi adicionada ao total HOJE
        if (!billedTablesToday.includes(tableId)) {
            // Calcula o valor total DO RECIBO ATUAL (com ou sem taxa, conforme checkbox)
            let receiptGrandTotal = 0;
            let receiptSubTotal = 0;
            if (tableOrders && tableOrders.length > 0) {
                 const allItemsMap = new Map();
                 tableOrders.forEach(order => { if (order.items) order.items.forEach(item => { const itemKey = `${item.dishId}_${item.observation || ''}`; if (allItemsMap.has(itemKey)) { allItemsMap.get(itemKey).quantity += item.quantity; } else { allItemsMap.set(itemKey, { ...item }); } }); });
                 allItemsMap.forEach(item => { receiptSubTotal += item.quantity * item.price; });
            }
            receiptGrandTotal = receiptSubTotal;
            if (includeTaxDefault && receiptSubTotal > 0) {
                receiptGrandTotal += receiptSubTotal * 0.10;
            }

            // Adiciona o valor ao total do dia
            dailyTotal += receiptGrandTotal;
            // Marca a mesa como faturada hoje
            billedTablesToday.push(tableId);

            // Salva os dados atualizados no localStorage
            localStorage.setItem(dailyTotalKey, dailyTotal.toString());
            localStorage.setItem(billedTablesKey, JSON.stringify(billedTablesToday));

            console.log(`Mesa ${table.number} (ID: ${tableId}) adicionada ao faturamento de hoje. Novo total: R$ ${dailyTotal.toFixed(2)}`);

            // Atualiza o card de faturamento no dashboard
            updateFinancialReport();

        } else {
             console.log(`Mesa ${table.number} (ID: ${tableId}) já foi contabilizada no faturamento de hoje. Não adicionando novamente.`);
        }

        // Abre o modal
        receiptModalInstance.show();
         //console.log(`Modal de recibo aberto para Mesa ${table.number} (ID: ${tableId})`);

    } else {
        console.error("Erro ao abrir modal de recibo: Elementos faltando ou mesa não encontrada.", {
            tableExists: !!table,
            receiptBodyExists: !!receiptBody,
            receiptTableNumberExists: !!receiptTableNumber,
            receiptModalInstanceExists: !!receiptModalInstance,
            taxCheckboxExists: !!taxCheckbox
        });
        alert("Não foi possível gerar a conta. Verifique o console para detalhes.");
    }
}


/**
 * Gera o conteúdo HTML para o corpo do modal de recibo.
 * @param {Array} orders Array de objetos de pedido para a mesa.
 * @param {number} tableNumber Número da mesa.
 * @param {number} peopleCount Número de pessoas na mesa.
 * @param {boolean} includeTax Indica se a taxa de serviço deve ser incluída.
 * @returns {string} String HTML do conteúdo do recibo.
 */
function generateReceiptHtml(orders, tableNumber, peopleCount = 1, includeTax = true) {
    // Cabeçalho fixo
    let html = `<div class="text-center mb-2"><h6>RestauranteSys</h6><small>CNPJ/Endereço Fictício</small></div>`;
    html += `<p class="mb-0"><strong>Mesa: ${tableNumber}</strong> (${peopleCount} ${peopleCount === 1 ? 'pessoa' : 'pessoas'})</p>`;
    html += `<p><small>Data/Hora Emissão: ${new Date().toLocaleString('pt-BR')}</small></p>`;
    html += `<hr>`;
    html += `<p class="mb-1"><strong>Itens Consumidos:</strong></p>`;

    let subTotal = 0;

    // Agrupa e soma itens de todos os pedidos relevantes
    if (orders && orders.length > 0) {
        const allItemsMap = new Map(); // Usar Map para agrupar itens iguais com observações iguais

        orders.forEach(order => {
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    // Chave única = ID do prato + Observação (para não agrupar itens com obs diferentes)
                    const itemKey = `${item.dishId}_${item.observation || ''}`;
                    if (allItemsMap.has(itemKey)) {
                        // Se já existe, soma a quantidade
                        allItemsMap.get(itemKey).quantity += item.quantity;
                    } else {
                        // Se não existe, adiciona uma cópia do item ao Map
                        allItemsMap.set(itemKey, { ...item });
                    }
                });
            }
        });

        // Gera o HTML para cada item agrupado
        if (allItemsMap.size > 0) {
            allItemsMap.forEach(item => {
                const itemTotal = item.quantity * item.price;
                subTotal += itemTotal;
                html += `
                    <div class="receipt-item">
                        <span>${item.quantity}x ${sanitizeHTML(item.name)}</span>
                        <span>R$ ${itemTotal.toFixed(2).replace('.', ',')}</span>
                    </div>`;
                // Adiciona a observação se houver
                if (item.observation) {
                    html += `<small class="text-muted d-block ms-2">- Obs: ${sanitizeHTML(item.observation)}</small>`;
                }
            });
        } else {
            html += "<p class='text-muted fst-italic'>Nenhum item consumido registrado nos pedidos.</p>";
        }
    } else {
        html += "<p class='text-muted fst-italic'>Nenhum pedido registrado para esta mesa.</p>";
    }

    // Linha do Subtotal
    html += `<hr>`;
    html += `<div class="receipt-item receipt-total"><span>Subtotal</span><span>R$ ${subTotal.toFixed(2).replace('.', ',')}</span></div>`;

    // Calcula e adiciona a taxa de serviço, se aplicável
    let serviceTax = 0;
    let grandTotal = subTotal;
    if (includeTax && subTotal > 0) {
        serviceTax = subTotal * 0.10; // 10%
        grandTotal += serviceTax;
        html += `<div class="receipt-item receipt-service-tax"><span>Taxa Serviço (10%)</span><span>R$ ${serviceTax.toFixed(2).replace('.', ',')}</span></div>`;
    }

    // Linha do Total Geral
    html += `<div class="receipt-grand-total receipt-item"><span>TOTAL</span><span>R$ ${grandTotal.toFixed(2).replace('.', ',')}</span></div>`;

    // Valor por pessoa (se mais de uma pessoa)
    if (peopleCount > 1 && grandTotal > 0) {
        const perPersonValue = grandTotal / peopleCount;
        html += `<div class="receipt-per-person"><span>(Valor por Pessoa: R$ ${perPersonValue.toFixed(2).replace('.', ',')})</span></div>`;
    }

    // Rodapé
    html += `<hr><p class="text-center small mt-2">Obrigado pela preferência!</p>`;

    return html;
}


// --- Funções de Dashboard ---
function updateDashboardCards() {
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');

    const totalTables = tables.length;
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const emptyTables = totalTables - occupiedTables;
    // Pedidos pendentes = solicitados OU em preparação
    const pendingOrders = orders.filter(o => o.status === 'solicitado' || o.status === 'preparacao').length;

    // Seleciona os elementos no DOM
    const totalEl = document.getElementById('total-tables-count');
    const occupiedEl = document.getElementById('occupied-tables-count');
    const emptyEl = document.getElementById('empty-tables-count');
    const pendingEl = document.getElementById('pending-orders-count');

    // Atualiza o texto dos elementos, verificando se existem antes
    if(totalEl) totalEl.textContent = totalTables;
    if(occupiedEl) occupiedEl.textContent = occupiedTables;
    if(emptyEl) emptyEl.textContent = emptyTables;
    if(pendingEl) pendingEl.textContent = pendingOrders;

     //console.log('Cards do Dashboard (exceto financeiro) atualizados:', { totalTables, occupiedTables, emptyTables, pendingOrders });
     // O card financeiro é atualizado por updateFinancialReport()
}

/**
 * Lê o faturamento total do dia do localStorage e atualiza o card no dashboard.
 */
function updateFinancialReport() {
    const dailyTotalKey = getDailyTotalKey();
    const totalAmountElement = document.getElementById('daily-total-amount');

    if (totalAmountElement) {
        const currentTotal = parseFloat(localStorage.getItem(dailyTotalKey) || '0');
        totalAmountElement.textContent = `R$ ${currentTotal.toFixed(2).replace('.', ',')}`;
        //console.log(`Card de Faturamento do Dia atualizado: R$ ${currentTotal.toFixed(2)}`);
    } else {
         //console.warn("Elemento #daily-total-amount não encontrado no dashboard.");
    }
}


/**
 * Obtém informações básicas (ID e Nome) do usuário logado a partir do localStorage.
 * @returns {object|null} Objeto com { id, name } ou null se não encontrar.
 */
function getLoggedInUserInfo() {
    const userId = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail'); // Pega o email também para fallback do nome

    if (!userId || !email) {
         console.warn("Não foi possível obter ID ou Email do usuário logado no localStorage.");
         return null;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.id === userId);

    if (user) {
        return {
            id: user.id,
            name: user.name || email.split('@')[0] // Usa nome ou parte do email
        };
    } else {
         console.error(`Usuário com ID ${userId} não encontrado no array de usuários.`);
         // Fallback usando apenas o email se o usuário não for encontrado (improvável mas seguro)
         return {
              id: userId, // Mantém o ID que estava no storage
              name: email.split('@')[0]
         };
    }
}


// --- Funções CRUD Perfil ---
/**
 * Atualiza os dados do perfil do usuário logado no localStorage.
 * @param {object} updatedUserData Objeto contendo { id, name, password? (opcional), imageUrl? (opcional) }.
 * @returns {boolean} True se a atualização foi bem-sucedida, false caso contrário.
 */
function updateUserProfile(updatedUserData) {
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const messageDiv = document.getElementById('profileForm-message'); // Div de mensagem na página de perfil

    const userIndex = users.findIndex(u => u.id === updatedUserData.id);

    if (userIndex === -1) {
        console.error("Erro ao atualizar perfil: Usuário não encontrado no localStorage.", updatedUserData.id);
        if (messageDiv) messageDiv.innerHTML = `<div class="alert alert-danger">Erro crítico: Seus dados não foram encontrados. Faça login novamente.</div>`;
        return false;
    }

    // Atualiza os campos permitidos
    users[userIndex].name = updatedUserData.name;
    // Atualiza a senha APENAS se uma nova foi fornecida
    if (updatedUserData.password) {
        users[userIndex].password = updatedUserData.password;
         //console.log("Senha do perfil atualizada.");
    }
    // Atualiza a URL da imagem (pode ser a mesma ou uma nova)
    if (updatedUserData.imageUrl !== undefined) { // Permite definir como null ou string vazia
        users[userIndex].imageUrl = updatedUserData.imageUrl;
    }

    // Salva o array de usuários atualizado
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Perfil do usuário atualizado com sucesso:', users[userIndex]);

    // Atualiza o nome exibido no header, se o usuário logado foi o que se atualizou
    if(localStorage.getItem('userId') === updatedUserData.id) {
        displayLoggedInUser();
    }

    return true;
}

/**
 * Sanitiza uma string para evitar XSS básico ao inseri-la como HTML.
 * Substitui <, >, & pelos seus equivalentes HTML.
 * ATENÇÃO: Esta é uma sanitização MUITO BÁSICA. Para segurança robusta,
 * use bibliotecas dedicadas ou frameworks que façam isso corretamente.
 * @param {string} str A string a ser sanitizada.
 * @returns {string} A string sanitizada.
 */
function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#039;');
}

/**
 * Sanitiza uma string para ser usada com segurança dentro de um atributo HTML (ex: data-observation).
 * Substitui aspas duplas e simples para evitar quebra do atributo.
 * @param {string} str A string a ser sanitizada.
 * @returns {string} A string pronta para ser usada em um atributo.
 */
function sanitizeAttribute(str) {
    if (str === null || str === undefined) return '';
     return String(str)
         .replace(/"/g, '&quot;') // Substitui aspas duplas
         .replace(/'/g, '&#039;'); // Substitui aspas simples
}


// ========= INICIALIZAÇÃO DE DADOS PADRÃO =========
function initializeLocalStorageData() {
    // Usuários Padrão
    if (!localStorage.getItem('users')) {
        const defaultUsers = [
            { id: 'u1', name: 'Admin Master', email: 'admin@restaurante.com', role: 'admin', password: 'password', imageUrl: 'img/users/admin_master.jpg' },
            { id: 'u2', name: 'Garçom Silva', email: 'garcom@restaurante.com', role: 'waiter', password: 'password', imageUrl: 'img/users/garcom_silva.jpg' },
            { id: 'u3', name: 'Garçonete Souza', email: 'garcom2@restaurante.com', role: 'waiter', password: 'password', imageUrl: null }, // Exemplo sem imagem
            { id: 'u4', name: 'Cozinheiro Chef', email: 'cozinha@restaurante.com', role: 'kitchen', password: 'password', imageUrl: 'img/users/cozinheiro_chef.jpg'},
            { id: 'u5', name: 'Ajudante Cozinha', email: 'cozinha2@restaurante.com', role: 'kitchen', password: 'password', imageUrl: null }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
        console.log('LocalStorage: Usuários padrão inicializados.');
    }

    // Mesas Padrão
    if (!localStorage.getItem('tables')) {
        const defaultTables = [];
        for (let i = 1; i <= 20; i++) {
            defaultTables.push({ id: `t${i}`, number: i, status: 'free', people: 0 });
        }
        // Pré-ocupa algumas mesas para demonstração
        const occupiedData = { 't2': 4, 't5': 2, 't8': 5, 't12': 1, 't17': 3 };
        defaultTables.forEach(table => {
            if (occupiedData[table.id]) {
                table.status = 'occupied';
                table.people = occupiedData[table.id];
            }
        });
        localStorage.setItem('tables', JSON.stringify(defaultTables));
        console.log('LocalStorage: Mesas padrão inicializadas.');
    }

    // Pratos Padrão (Lista Completa)
    if (!localStorage.getItem('dishes')) {
        const defaultDishes = [
            { id: 'd1', name: 'Bruschetta Tradicional', description: 'Pão italiano tostado com tomate, alho, manjericão e azeite.', price: 22.50, category: 'Entradas', imageUrl: 'img/dishes/bruschetta_tradicional.jpg' },
            { id: 'd2', name: 'Carpaccio de Carne', description: 'Finas fatias de carne bovina crua com molho de alcaparras e parmesão.', price: 35.00, category: 'Entradas', imageUrl: 'img/dishes/carpaccio_de_carne.jpg' },
            { id: 'd3', name: 'Dadinhos de Tapioca', description: 'Cubos de tapioca com queijo coalho fritos, servidos com melaço.', price: 28.00, category: 'Entradas', imageUrl: 'img/dishes/dadinhos_de_tapioca.jpg' },
            { id: 'd4', name: 'Salada Caesar com Frango', description: 'Alface romana, croutons, parmesão, molho Caesar e tiras de frango grelhado.', price: 38.00, category: 'Saladas', imageUrl: 'img/dishes/salada_caesar_com_frango.jpg' },
            { id: 'd5', name: 'Salada Caprese', description: 'Tomate, mussarela de búfala, manjericão fresco e pesto.', price: 32.00, category: 'Saladas', imageUrl: 'img/dishes/salada_caprese.jpg' },
            { id: 'd6', name: 'Salada de Quinoa', description: 'Quinoa, pepino, tomate cereja, pimentão, cebola roxa e coentro com molho cítrico.', price: 35.00, category: 'Saladas', imageUrl: 'img/dishes/salada_de_quinoa.jpg' },
            { id: 'd7', name: 'Spaghetti Carbonara', description: 'Massa longa com molho à base de ovos, queijo pecorino, pancetta e pimenta do reino.', price: 45.00, category: 'Massas', imageUrl: 'img/dishes/spaghetti_carbonara.jpg' },
            { id: 'd8', name: 'Fettuccine Alfredo', description: 'Massa fresca com molho cremoso de queijo parmesão e manteiga.', price: 42.00, category: 'Massas', imageUrl: 'img/dishes/fettuccine_alfredo.jpg' },
            { id: 'd9', name: 'Lasanha à Bolonhesa', description: 'Camadas de massa, molho bolonhesa, molho branco e queijo gratinado.', price: 48.00, category: 'Massas', imageUrl: 'img/dishes/lasanha_a_bolonhesa.jpg' },
            { id: 'd10', name: 'Picanha Grelhada', description: 'Fatia generosa de picanha grelhada no ponto desejado, acompanha farofa e vinagrete.', price: 65.00, category: 'Carnes', imageUrl: 'img/dishes/picanha_grelhada.jpg' },
            { id: 'd11', name: 'Filé Mignon ao Molho Madeira', description: 'Medalhão de filé mignon grelhado com molho madeira e champignons.', price: 72.00, category: 'Carnes', imageUrl: 'img/dishes/file_mignon_ao_molho_madeira.jpg' },
            { id: 'd12', name: 'Costela Suína BBQ', description: 'Costelinha de porco assada lentamente com molho barbecue caseiro.', price: 58.00, category: 'Carnes', imageUrl: 'img/dishes/costela_suina_bbq.jpg' },
            { id: 'd13', name: 'Salmão Grelhado com Legumes', description: 'Posta de salmão grelhada com azeite e ervas, servida com legumes salteados.', price: 68.00, category: 'Peixes', imageUrl: 'img/dishes/salmao_grelhado_com_legumes.jpg' },
            { id: 'd14', name: 'Moqueca de Peixe Baiana', description: 'Peixe cozido no leite de coco, azeite de dendê, pimentões e coentro.', price: 75.00, category: 'Peixes', imageUrl: 'img/dishes/moqueca_de_peixe_baiana.jpg' },
            { id: 'd15', name: 'Tilápia à Belle Meunière', description: 'Filé de tilápia grelhado na manteiga com alcaparras, champignon e camarões.', price: 62.00, category: 'Peixes', imageUrl: 'img/dishes/tilapia_a_belle_meuniere.jpg' },
            { id: 'd16', name: 'Frango à Parmegiana', description: 'Filé de frango empanado, coberto com molho de tomate e queijo mussarela gratinado.', price: 46.00, category: 'Aves', imageUrl: 'img/dishes/frango_a_parmegiana.jpg' },
            { id: 'd17', name: 'Risoto de Frango com Açafrão', description: 'Arroz arbóreo cremoso com cubos de frango, açafrão e parmesão.', price: 52.00, category: 'Aves', imageUrl: 'img/dishes/risoto_de_frango_com_acafrao.jpg' },
            { id: 'd18', name: 'Coxa e Sobrecoxa Assada', description: 'Frango assado lentamente com ervas e batatas coradas.', price: 40.00, category: 'Aves', imageUrl: 'img/dishes/coxa_e_sobrecoxa_assada.jpg' },
            { id: 'd19', name: 'Pudim de Leite Condensado', description: 'Clássico pudim de leite condensado com calda de caramelo.', price: 18.00, category: 'Sobremesas', imageUrl: 'img/dishes/pudim_de_leite_condensado.jpg' },
            { id: 'd20', name: 'Petit Gateau com Sorvete', description: 'Bolinho quente de chocolate com centro cremoso, servido com sorvete de creme.', price: 25.00, category: 'Sobremesas', imageUrl: 'img/dishes/petit_gateau_com_sorvete.jpg' },
            { id: 'd21', name: 'Mousse de Maracujá', description: 'Mousse leve e aerada de maracujá com calda da fruta.', price: 20.00, category: 'Sobremesas', imageUrl: 'img/dishes/mousse_de_maracuja.jpg' },
            { id: 'd22', name: 'Suco Natural de Laranja', description: '300ml de suco de laranja feito na hora.', price: 10.00, category: 'Bebidas', imageUrl: 'img/dishes/suco_natural_de_laranja.jpg' },
            { id: 'd23', name: 'Refrigerante Lata', description: 'Coca-Cola, Guaraná Antarctica, etc.', price: 6.00, category: 'Bebidas', imageUrl: 'img/dishes/refrigerante_lata.jpg' },
            { id: 'd24', name: 'Água Mineral com Gás', description: 'Garrafa 300ml.', price: 5.00, category: 'Bebidas', imageUrl: 'img/dishes/agua_mineral_com_gas.jpg' },
            { id: 'd25', name: 'Café Espresso', description: 'Café curto e intenso.', price: 7.00, category: 'Bebidas', imageUrl: 'img/dishes/cafe_espresso.jpg'} // Exemplo adicional
        ];
        localStorage.setItem('dishes', JSON.stringify(defaultDishes));
        console.log('LocalStorage: Pratos padrão inicializados.');
    }

    // Pedidos FAKE para demonstração
    if (!localStorage.getItem('orders')) {
        const users = JSON.parse(localStorage.getItem('users') || '[]'); // Carrega usuários para pegar IDs
        const adminUser = users.find(u=>u.role==='admin') || {id:'u1', name:'Admin Master'};
        const waiterUser = users.find(u=>u.email==='garcom@restaurante.com') || {id:'u2', name:'Garçom Silva'};
        const now = Date.now();

        const fakeOrders = [
            // Pedido 1 (Mesa 2, Solicitado, Garçom)
            { orderId: 'o' + (now - 900000), tableId: 't2', tableNumber: 2, items: [ { dishId: 'd1', name: 'Bruschetta Tradicional', price: 22.50, quantity: 1, observation: '', category: 'Entradas' }, { dishId: 'd23', name: 'Refrigerante Lata', price: 6.00, quantity: 2, observation: 'Coca Zero', category: 'Bebidas' } ], status: 'solicitado', createdAt: new Date(now - 900000).toISOString(), updatedAt: new Date(now - 900000).toISOString(), createdByUserId: waiterUser.id, createdByUserName: waiterUser.name },
            // Pedido 2 (Mesa 5, Em Preparação, Admin)
            { orderId: 'o' + (now - 600000), tableId: 't5', tableNumber: 5, items: [ { dishId: 'd9', name: 'Lasanha à Bolonhesa', price: 48.00, quantity: 1, observation: 'Sem cebola', category: 'Massas' } ], status: 'preparacao', createdAt: new Date(now - 600000).toISOString(), updatedAt: new Date(now - 300000).toISOString(), createdByUserId: adminUser.id, createdByUserName: adminUser.name },
             // Pedido 3 (Mesa 8, Concluído, Garçom)
            { orderId: 'o' + (now - 1200000), tableId: 't8', tableNumber: 8, items: [ { dishId: 'd16', name: 'Frango à Parmegiana', price: 46.00, quantity: 2, observation: '', category: 'Aves' }, { dishId: 'd22', name: 'Suco Natural de Laranja', price: 10.00, quantity: 2, observation: '', category: 'Bebidas' } ], status: 'concluido', createdAt: new Date(now - 1200000).toISOString(), updatedAt: new Date(now - 100000).toISOString(), createdByUserId: waiterUser.id, createdByUserName: waiterUser.name },
             // Pedido 4 (Mesa 12, Solicitado, Garçom)
            { orderId: 'o' + (now - 300000), tableId: 't12', tableNumber: 12, items: [ { dishId: 'd21', name: 'Mousse de Maracujá', price: 20.00, quantity: 1, observation: '', category: 'Sobremesas' } ], status: 'solicitado', createdAt: new Date(now - 300000).toISOString(), updatedAt: new Date(now - 300000).toISOString(), createdByUserId: waiterUser.id, createdByUserName: waiterUser.name },
             // Pedido 5 (Mesa 17, Em Preparação, Admin)
            { orderId: 'o' + (now - 100000), tableId: 't17', tableNumber: 17, items: [ { dishId: 'd10', name: 'Picanha Grelhada', price: 65.00, quantity: 1, observation: 'Ao ponto', category: 'Carnes' }, { dishId: 'd24', name: 'Água Mineral com Gás', price: 5.00, quantity: 1, observation: '', category: 'Bebidas' } ], status: 'preparacao', createdAt: new Date(now - 100000).toISOString(), updatedAt: new Date(now - 50000).toISOString(), createdByUserId: adminUser.id, createdByUserName: adminUser.name },
             // Pedido 6 (Mesa 5, Concluído, Garçom - pedido antigo para mesma mesa)
            { orderId: 'o' + (now - 1800000), tableId: 't5', tableNumber: 5, items: [ { dishId: 'd1', name: 'Bruschetta Tradicional', price: 22.50, quantity: 1, observation: '', category: 'Entradas' }, { dishId: 'd22', name: 'Suco Natural de Laranja', price: 10.00, quantity: 1, observation: '', category: 'Bebidas' } ], status: 'concluido', createdAt: new Date(now - 1800000).toISOString(), updatedAt: new Date(now - 1700000).toISOString(), createdByUserId: waiterUser.id, createdByUserName: waiterUser.name },
        ];
        localStorage.setItem('orders', JSON.stringify(fakeOrders));
        console.log('LocalStorage: Pedidos FAKE inicializados.');
    }
}
