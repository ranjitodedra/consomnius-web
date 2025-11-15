// Auto-detect platform and highlight the appropriate download card
document.addEventListener('DOMContentLoaded', () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = /macintosh|mac os x/i.test(navigator.userAgent);
    
    // Check if it's an Apple Silicon Mac (rough detection)
    // Note: This is not 100% accurate, but provides a good hint
    const isAppleSilicon = isMac && navigator.platform === 'MacIntel' && 
                          navigator.maxTouchPoints > 1;
    
    const downloadCards = document.querySelectorAll('.download-card');
    
    // Add click handlers for better UX
    downloadCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking the download button directly
            if (e.target.classList.contains('download-btn')) {
                return;
            }
            
            const btn = card.querySelector('.download-btn');
            if (btn) {
                btn.click();
            }
        });
    });
    
    // Optional: Add a subtle highlight animation on load
    downloadCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.animation = 'fadeIn 0.6s ease-out forwards';
    });
});

