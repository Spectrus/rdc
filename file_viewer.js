// File viewer functionality
document.addEventListener('DOMContentLoaded', function() {
    // Function to handle file viewing based on file type
    function openFile(filePath) {
        const fileExtension = filePath.split('.').pop().toLowerCase();
        
        // Video files
        if (['mp4', 'mpg', 'm2v'].includes(fileExtension)) {
            openVideoViewer(filePath);
            return false;
        }
        
        // PDF files
        if (fileExtension === 'pdf') {
            window.open(filePath, '_blank');
            return false;
        }
        
        // Image files
        if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
            openImageViewer(filePath);
            return false;
        }
        
        // Default behavior for other file types
        window.open(filePath, '_blank');
        return false;
    }
    
    // Function to open video viewer
    function openVideoViewer(videoPath) {
        const videoViewer = document.createElement('div');
        videoViewer.className = 'file-viewer-overlay';
        videoViewer.innerHTML = `
            <div class="file-viewer-content">
                <span class="close-viewer">&times;</span>
                <video controls autoplay>
                    <source src="${videoPath}" type="video/${videoPath.split('.').pop().toLowerCase() === 'mp4' ? 'mp4' : 'mpeg'}">
                    Seu navegador não suporta a reprodução de vídeos.
                </video>
            </div>
        `;
        
        document.body.appendChild(videoViewer);
        
        // Close viewer when clicking on close button or outside the content
        const closeBtn = videoViewer.querySelector('.close-viewer');
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(videoViewer);
        });
        
        videoViewer.addEventListener('click', function(e) {
            if (e.target === videoViewer) {
                document.body.removeChild(videoViewer);
            }
        });
    }
    
    // Function to open image viewer
    function openImageViewer(imagePath) {
        const imageViewer = document.createElement('div');
        imageViewer.className = 'file-viewer-overlay';
        imageViewer.innerHTML = `
            <div class="file-viewer-content">
                <span class="close-viewer">&times;</span>
                <img src="${imagePath}" alt="Imagem em tamanho completo">
            </div>
        `;
        
        document.body.appendChild(imageViewer);
        
        // Close viewer when clicking on close button or outside the content
        const closeBtn = imageViewer.querySelector('.close-viewer');
        closeBtn.addEventListener('click', function() {
            document.body.removeChild(imageViewer);
        });
        
        imageViewer.addEventListener('click', function(e) {
            if (e.target === imageViewer) {
                document.body.removeChild(imageViewer);
            }
        });
    }
    
    // Add click event listeners to all read buttons
    const readButtons = document.querySelectorAll('.read-button:not(.password-button)');
    readButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const filePath = this.getAttribute('href');
            openFile(filePath);
        });
    });
});
