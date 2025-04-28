// Timeline auto-scroll functionality with improved positioning
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
            
            // Hide content for non-highlighted items
            const content = item.querySelector('.timeline-content-horizontal');
            if (content) {
                content.style.opacity = '0';
                content.style.visibility = 'hidden';
            }
        });
        
        // Add highlight to current item
        timelineItems[index].classList.add('highlight');
        
        // Show content for highlighted item
        const currentContent = timelineItems[index].querySelector('.timeline-content-horizontal');
        if (currentContent) {
            currentContent.style.opacity = '1';
            currentContent.style.visibility = 'visible';
            
            // Ensure content is properly positioned
            currentContent.style.maxHeight = '350px';
            currentContent.style.overflowY = 'auto';
        }
        
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
    
    // Ensure all timeline content is hidden by default and properly sized
    timelineItems.forEach(item => {
        const content = item.querySelector('.timeline-content-horizontal');
        if (content) {
            content.style.opacity = '0';
            content.style.visibility = 'hidden';
            content.style.maxHeight = '350px';
            content.style.overflowY = 'auto';
        }
    });
    
    // Add hover effect to show content
    timelineItems.forEach((item, index) => {
        item.addEventListener('mouseenter', function() {
            // Show content on hover
            const content = item.querySelector('.timeline-content-horizontal');
            if (content) {
                content.style.opacity = '1';
                content.style.visibility = 'visible';
            }
        });
        
        item.addEventListener('mouseleave', function() {
            // Hide content when not hovering, unless it's the highlighted item
            if (!item.classList.contains('highlight')) {
                const content = item.querySelector('.timeline-content-horizontal');
                if (content) {
                    content.style.opacity = '0';
                    content.style.visibility = 'hidden';
                }
            }
        });
    });
    
    // Add controls for auto-scrolling
    const timelineSection = document.querySelector('.timeline-section');
    if (timelineSection) {
        // Ensure the timeline section has proper height
        timelineSection.style.minHeight = '700px';
        
        // Check if controls already exist
        if (!document.querySelector('.timeline-controls')) {
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'timeline-controls';
            controlsDiv.innerHTML = `
                <button id="timeline-play" class="timeline-control-button">Auto-scrolling...</button>
            `;
            timelineSection.appendChild(controlsDiv);
        }
        
        // Add event listener to control button
        const playButton = document.getElementById('timeline-play');
        if (playButton) {
            playButton.addEventListener('click', function() {
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
            
            // Set button to active state initially
            playButton.classList.add('active');
            playButton.textContent = 'Auto-scrolling...';
        }
    }
    
    // Ensure the horizontal timeline has proper height
    const horizontalTimeline = document.querySelector('.horizontal-timeline');
    if (horizontalTimeline) {
        horizontalTimeline.style.height = '650px';
    }
    
    // Ensure the timeline track has proper height
    const timelineTrack = document.querySelector('.timeline-track');
    if (timelineTrack) {
        timelineTrack.style.height = '600px';
    }
    
    // Add manual navigation with mouse click
    timelineItems.forEach((item, index) => {
        // Ensure each item has proper height
        item.style.height = '600px';
        
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
    });
    
    // Start auto-scrolling by default
    if (timelineItems.length > 0) {
        highlightTimelineItem(currentIndex);
        startAutoScroll();
    }
});
