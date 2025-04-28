// Dados dos vídeos do acervo
const videos = [
    {
        titulo: "Picnic na Fazenda Castanheira",
        id: "2GDY20aWciM",
        protegido: false,
        codigo: "101"
    },
    {
        titulo: "Picnic no Quintal da Casa de nosso Pai",
        id: "-OCvEII3Xyg",
        protegido: false,
        codigo: "102"
    },
    {
        titulo: "Lembranças de Lugares",
        id: "V9zv1ltttXU",
        protegido: true,
        codigo: "103"
    },
    {
        titulo: "Geração XUXA. O tempo passou",
        id: "D1dNMD7rd-U",
        protegido: false,
        codigo: "104"
    },
    {
        titulo: "José Álvaro e Mari Carmen Cinquenta anos depois",
        id: "04qJBryv53M",
        protegido: false,
        codigo: "105"
    },
    {
        titulo: "Recordações de Natal 1982 e 83– Fotos sem som",
        id: "CwUSWc4u6N0",
        protegido: false,
        codigo: "106"
    },
    {
        titulo: "Aniversário Bella dois anos - Brasília",
        id: "WaeSjD2UZdE",
        protegido: false,
        codigo: "107"
    },
    {
        titulo: "86 anos Pai – 50 anos Augusto",
        id: "mRn20jWdNd8",
        protegido: false,
        codigo: "108"
    },
    {
        titulo: "Dona Avelina = Parte 1",
        id: "GglxnXBYs5E",
        protegido: true,
        codigo: "109"
    },
    {
        titulo: "Dona Avelina - Final",
        id: "Hdb-hTM03ds",
        protegido: true,
        codigo: "110"
    },
    {
        titulo: "Professora Didi Ramos",
        id: "HmjuEzKMmoY",
        protegido: true,
        codigo: "111"
    },
    {
        titulo: "Família Duarte",
        id: "8i8Hi4KFzu8",
        protegido: true,
        codigo: "112"
    },
    {
        titulo: "Assoc. Médica Lafaiete 1956 Dr. Pedro Paulo",
        id: "bqaObzM_STU",
        protegido: true,
        codigo: "113"
    },
    {
        titulo: "Geraldo Zebral",
        id: "yYN8vIgaGTM",
        protegido: true,
        codigo: "114"
    },
    {
        titulo: "Bodas de Ouro José Álvaro Mari Carmem",
        id: "jbEb-j8jm3M",
        protegido: false,
        codigo: "115"
    },
    {
        titulo: "Despedida nossa Casa Rua Melo Viana 75",
        id: "tC6wVpqTo2Y",
        protegido: false,
        codigo: "116"
    },
    {
        titulo: "Fumec – Comemoração 40 anos formatura - Início",
        id: "pyTHG4CRWG8",
        protegido: true,
        codigo: "117"
    },
    {
        titulo: "Fumec - Comemoração 40 anos formatura - Final",
        id: "8uweco9C2F8",
        protegido: true,
        codigo: "118"
    },
    {
        titulo: "FUMEC – Solenidade na Fumec - 40 anos Formados",
        id: "kAlTIJZTq1c",
        protegido: true,
        codigo: "119"
    },
    {
        titulo: "Natal Família na Casa Tia Dulce",
        id: "WmiPzL3zfB4",
        protegido: false,
        codigo: "120"
    },
    {
        titulo: "Procissão em Salamanca 1",
        id: "du84A_ryPRA",
        protegido: true,
        codigo: "121"
    },
    {
        titulo: "Procissão em Salamanca 2",
        id: "ijdR6F4SwHI",
        protegido: true,
        codigo: "122"
    },
    {
        titulo: "Procissão em Salamanca 3",
        id: "4TM2HK6kH4c",
        protegido: true,
        codigo: "123"
    },
    {
        titulo: "Procissão em Salamanca 4",
        id: "Gx9I3X6y5a8",
        protegido: true,
        codigo: "124"
    },
    {
        titulo: "Professora Odete Costa",
        id: "ryxRnbQK728",
        protegido: true,
        codigo: "125"
    },
    {
        titulo: "Professora Dona Raquel",
        id: "tUURcIUgbRY",
        protegido: true,
        codigo: "126"
    },
    {
        titulo: "FUMEC BH três depoimentos",
        id: "QiJlTOvM4bU",
        protegido: true,
        codigo: "127"
    },
    {
        titulo: "FUMEC BH dois depoimentos",
        id: "TBsjIp2XWjA",
        protegido: true,
        codigo: "128"
    },
    {
        titulo: "Aniversário 50 anos do João Pio",
        id: "TXCPfzG4AD0",
        protegido: false,
        codigo: "129"
    },
    {
        titulo: "Missa campal em Lafaiete - 1983",
        id: "_AWfyiFmlZE",
        protegido: true,
        codigo: "130"
    },
    {
        titulo: "Minhas primas Castanheira Friche",
        id: "53XbKmx2LQo",
        protegido: true,
        codigo: "131"
    },
    {
        titulo: "Centenário Dr Ary Belisário I",
        id: "MWwodGr86FM",
        protegido: true,
        codigo: "132"
    },
    {
        titulo: "Centenário Dr Ary Belisário II",
        id: "Evk4YtiqW9w",
        protegido: true,
        codigo: "133"
    },
    {
        titulo: "Luiza Izabel Biagioni Uma mulher iluminada",
        id: "2YJyskkDJLc",
        protegido: true,
        codigo: "134"
    },
    {
        titulo: "SEST SENAT Patos de Minas",
        id: "SVf5Mh3hIz8",
        protegido: false,
        codigo: "135"
    },
    {
        titulo: "Flores de Australia",
        id: "Flores_de_Australia",
        protegido: false,
        local: true,
        codigo: "137"
    }
];

// Função para renderizar a seção de vídeos
function renderizarVideos() {
    const videosContainer = document.getElementById('videos-container');
    if (!videosContainer) return;
    
    videosContainer.innerHTML = '';
    
    videos.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        
        let videoContent = '';
        
        if (video.local) {
            videoContent = `
                <div class="document-code">${video.codigo}</div>
                <h3>${video.titulo}</h3>
                <div class="video-thumbnail">
                    <a href="videos/${video.id}.mp4" target="_blank">
                        <img src="images/video-thumbnail.jpg" alt="${video.titulo}">
                        <div class="play-button">▶</div>
                    </a>
                </div>
            `;
        } else {
            videoContent = `
                <div class="document-code">${video.codigo}</div>
                <h3>${video.titulo}</h3>
                <div class="video-thumbnail">
                    <a href="javascript:void(0)" onclick="openVideo('${video.id}', ${video.protegido})">
                        <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.titulo}">
                        <div class="play-button">▶</div>
                        ${video.protegido ? '<div class="protected-badge">P</div>' : ''}
                    </a>
                </div>
            `;
        }
        
        videoCard.innerHTML = videoContent;
        videosContainer.appendChild(videoCard);
    });
}

// Inicializar a seção de vídeos quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    renderizarVideos();
});
