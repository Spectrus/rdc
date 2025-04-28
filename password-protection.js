function checkPassword(videoId) {
    const password = prompt("Este vídeo é protegido. Por favor, digite a senha para acessá-lo:");
    if (password === "1856") {
        window.open(`https://youtu.be/${videoId}`, '_blank');
    } else {
        alert("Senha incorreta. Acesso negado.");
    }
}

function openVideo(videoId, isProtected) {
    if (isProtected) {
        checkPassword(videoId);
    } else {
        window.open(`https://youtu.be/${videoId}`, '_blank');
    }
}
