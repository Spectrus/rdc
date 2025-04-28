// Enhanced timeline functionality to fix remaining issues
document.addEventListener('DOMContentLoaded', function() {
    // Get all timeline items
    const timelineItems = document.querySelectorAll('.timeline-item-horizontal');
    let currentIndex = 0;
    let autoScrollInterval;
    
    // Function to highlight a specific timeline item
    function highlightTimelineItem(index) {
        // Remove highlight from all items
        timelineItems.forEach(item => {
            item.classList.remove('highlight');
        });
        
        // Add highlight to current item
        timelineItems[index].classList.add('highlight');
        
        // Scroll the timeline to show the current item
        const timelineTrack = document.querySelector('.timeline-track');
        const itemWidth = timelineItems[index].offsetWidth + 50; // Item width + margin
        const scrollPosition = index * itemWidth;
        
        // Smooth scroll to the position
        if (timelineTrack && timelineTrack.parentElement) {
            timelineTrack.parentElement.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
        }
    }
    
    // Function to start auto-scrolling
    function startAutoScroll() {
        // Clear any existing interval
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
        }
        
        // Set interval to change highlighted item every 5 seconds
        autoScrollInterval = setInterval(function() {
            currentIndex = (currentIndex + 1) % timelineItems.length;
            highlightTimelineItem(currentIndex);
        }, 5000); // 5 seconds
    }
    
    // Ensure the timeline content boxes are properly positioned
    timelineItems.forEach(item => {
        const content = item.querySelector('.timeline-content-horizontal');
        if (content) {
            content.style.display = 'block';
            content.style.position = 'absolute';
            content.style.backgroundColor = '#fff';
            content.style.border = '1px solid #e0e0e0';
            content.style.padding = '20px';
            content.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            content.style.width = '280px';
            content.style.top = '30%';
            content.style.transform = 'translateY(-100%)';
            content.style.zIndex = '2';
        }
    });
    
    // Add controls for auto-scrolling if they don't exist
    const timelineSection = document.querySelector('.timeline-section');
    if (timelineSection && !document.querySelector('.timeline-controls')) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'timeline-controls';
        controlsDiv.innerHTML = `
            <button id="timeline-play" class="timeline-control-button">Auto-scroll</button>
        `;
        timelineSection.appendChild(controlsDiv);
        
        // Add event listener to control button
        document.getElementById('timeline-play').addEventListener('click', function() {
            if (this.classList.contains('active')) {
                // If already active, deactivate and stop auto-scroll
                this.classList.remove('active');
                this.textContent = 'Auto-scroll';
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }
            } else {
                // If not active, activate and start auto-scroll
                this.classList.add('active');
                this.textContent = 'Auto-scrolling...';
                startAutoScroll();
            }
        });
    }
    
    // Add manual navigation with mouse click
    timelineItems.forEach((item, index) => {
        item.addEventListener('click', function() {
            currentIndex = index;
            highlightTimelineItem(currentIndex);
            
            // Restart auto-scroll if it's active
            const playButton = document.getElementById('timeline-play');
            if (playButton && playButton.classList.contains('active')) {
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                }
                startAutoScroll();
            }
        });
        
        // Ensure the timeline marker (circle) is visible
        if (!item.querySelector('.timeline-marker')) {
            item.style.position = 'relative';
        }
    });
    
    // Ensure the timeline track has the horizontal line
    const timelineTrack = document.querySelector('.timeline-track');
    if (timelineTrack) {
        timelineTrack.style.position = 'relative';
        timelineTrack.style.display = 'inline-block';
        timelineTrack.style.height = '400px';
        timelineTrack.style.minWidth = '100%';
        timelineTrack.style.padding = '20px 0';
        timelineTrack.style.whiteSpace = 'nowrap';
    }
    
    // Start auto-scrolling by default
    highlightTimelineItem(currentIndex);
    startAutoScroll();
    
    // Set button to active state initially
    const playButton = document.getElementById('timeline-play');
    if (playButton) {
        playButton.classList.add('active');
        playButton.textContent = 'Auto-scrolling...';
    }
    
    // Force a redraw of the timeline section to ensure all styles are applied
    if (timelineSection) {
        timelineSection.style.opacity = '0.99';
        setTimeout(() => {
            timelineSection.style.opacity = '1';
        }, 10);
    }
});
