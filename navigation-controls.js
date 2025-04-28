// Funcionalidade para os controles de navegação

document.addEventListener('DOMContentLoaded', function() {
    // Criar elementos de setas de navegação se ainda não existirem
    if (!document.querySelector('.nav-arrow-up')) {
        // Criar seta para cima
        const arrowUp = document.createElement('div');
        arrowUp.className = 'nav-arrow nav-arrow-up';
        arrowUp.innerHTML = '&#9650;'; // Símbolo de seta para cima
        arrowUp.title = 'Ir para o topo';
        document.body.appendChild(arrowUp);
        
        // Adicionar evento de clique para ir para o topo
        arrowUp.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    if (!document.querySelector('.nav-arrow-down')) {
        // Criar seta para baixo
        const arrowDown = document.createElement('div');
        arrowDown.className = 'nav-arrow nav-arrow-down';
        arrowDown.innerHTML = '&#9660;'; // Símbolo de seta para baixo
        arrowDown.title = 'Ir para o final';
        document.body.appendChild(arrowDown);
        
        // Adicionar evento de clique para ir para o final
        arrowDown.addEventListener('click', function() {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        });
    }
    
    // Obter referências aos elementos
    const navBar = document.querySelector('.nav-bar');
    const arrowUp = document.querySelector('.nav-arrow-up');
    const arrowDown = document.querySelector('.nav-arrow-down');
    
    // Função para verificar a posição do mouse e mostrar/esconder elementos
    function handleMousePosition(event) {
        const mouseY = event.clientY;
        const windowHeight = window.innerHeight;
        
        // Verificar se o mouse está próximo ao topo da tela (100px)
        if (mouseY < 100) {
            // Mostrar a barra de navegação
            navBar.style.top = '0';
            
            // Mostrar a seta para cima se não estiver no topo
            if (window.scrollY > 200) {
                arrowUp.style.opacity = '1';
                arrowUp.style.visibility = 'visible';
            } else {
                arrowUp.style.opacity = '0';
                arrowUp.style.visibility = 'hidden';
            }
        } else {
            // Esconder a barra de navegação
            navBar.style.top = '-80px';
            
            // Esconder a seta para cima se o mouse não estiver no topo
            arrowUp.style.opacity = '0';
            arrowUp.style.visibility = 'hidden';
        }
        
        // Verificar se o mouse está próximo ao final da tela (100px)
        if (mouseY > windowHeight - 100) {
            // Mostrar a seta para baixo se não estiver no final
            if (window.scrollY < document.body.scrollHeight - windowHeight - 200) {
                arrowDown.style.opacity = '1';
                arrowDown.style.visibility = 'visible';
            } else {
                arrowDown.style.opacity = '0';
                arrowDown.style.visibility = 'hidden';
            }
        } else {
            // Esconder a seta para baixo se o mouse não estiver no final
            arrowDown.style.opacity = '0';
            arrowDown.style.visibility = 'hidden';
        }
    }
    
    // Adicionar evento para rastrear a posição do mouse
    document.addEventListener('mousemove', handleMousePosition);
    
    // Adicionar evento de rolagem para atualizar a visibilidade das setas
    window.addEventListener('scroll', function() {
        // Obter a posição atual do mouse
        const mouseEvent = new MouseEvent('mousemove', {
            clientY: window.event ? window.event.clientY : 0
        });
        
        // Chamar a função de tratamento da posição do mouse
        handleMousePosition(mouseEvent);
    });
    
    // Inicializar o estado dos elementos
    navBar.style.top = '-80px'; // Inicialmente escondido
    arrowUp.style.opacity = '0';
    arrowUp.style.visibility = 'hidden';
    arrowDown.style.opacity = '0';
    arrowDown.style.visibility = 'hidden';
});
