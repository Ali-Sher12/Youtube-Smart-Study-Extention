"use strict";

const ALLOWED_KEYWORDS = [ // playlist not filtering for some reason.
    "topic",
    "lecture",
    "lectures",
    "course",
    "courses",
    "full course",
    "complete course",
    "semester",
    "module",
    "lesson",
    "tutorial",
    "database",
    "university",
    "management",
    "programming",
    "code",
    "coding",
    "lec-",
    "lec#",
    "college",
    "student",
    "students",
    "software",
    "syllabus",
    "discussion",
    "java",
    "python",
    "c++"
];

const ALLOWED_CHANNELS = [
    "jenny's lectures cs it",
    "gate smashers",
    "abdul bari",
    "code with harry",
    "apna college",
    "take u forward",
    "striver",
    "luv",
    "pepcoding",
    "mycodeschool",
    "coursera",
    "mit",
    "stanford",
    "edureka",
    "simplilearn",
    "freecodecamp",
    "traversy media",
    "programming with mosh"
];

// === CRITICAL: Inject CSS immediately to hide all videos by default ===
const style = document.createElement('style');
style.id = 'yt-educational-filter-style';
style.textContent = `
    /* Hide ALL video content immediately */
    ytd-rich-item-renderer,
    ytd-video-renderer,
    ytd-grid-video-renderer,
    ytd-compact-video-renderer,
    ytd-compact-playlist-renderer,
    ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer,
    ytd-watch-card-compact-video-renderer,
    ytd-compact-autoplay-renderer,
    ytd-playlist-renderer,
    ytd-playlist-video-renderer,
    ytd-radio-renderer {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
    }
    
    /* Exception: Show only approved videos */
    .yt-filter-approved {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: auto !important;
        overflow: visible !important;
    }
    
    /* Hide comments section */
    ytd-comments {
        display: none !important;
    }
`;
document.head.appendChild(style);

class YouTubeFilter {
    constructor() {
        this.allowedVideoIds = new Set();
        this.processing = false;
        this.observer = null;
        this.initialized = false;
        this.lastRun = 0;
        this.MIN_RUN_INTERVAL = 500;
        
        this.init();
    }

    init() {
        // Run immediately and keep running
        this.runFilters();
        
        // Set up observers
        this.setupContentObserver();
        this.setupSPADetection();
        
        this.initialized = true;
        console.log('YouTube Educational Filter initialized');
    }

    isAllowedChannel(channelName) {
        if (!channelName) return false;
        const normalized = channelName.toLowerCase().trim();
        return ALLOWED_CHANNELS.some(channel => normalized.includes(channel));
    }

    isAllowedByTitle(title) {
        if (!title) return false;
        const normalizedTitle = title.toLowerCase();
        return ALLOWED_KEYWORDS.some(keyword => normalizedTitle.includes(keyword));
    }

    getVideoInfo(element) {
        let title = '';
        let channel = '';
        let videoId = null;

        // Get title - ONLY from title-specific elements, NOT from aria-labels or descriptions
        const titleSelectors = [
            '#video-title',
            '#video-title-link',
            '.title', // But only if it's likely a video title
            'h1, h2, h3' // Header elements
        ];

        for (const selector of titleSelectors) {
            const els = element.querySelectorAll(selector);
            for (const el of els) {
                // Get text content only, NOT aria-label or title attributes (which often contain descriptions)
                const text = el.textContent || el.innerText || '';
                const cleanText = text.trim();
                
                // Validate that this looks like a video title (not a description or metadata)
                if (cleanText && 
                    cleanText.length > 5 && 
                    cleanText.length < 150 && // Titles are usually not too long
                    !cleanText.includes('•') && // Avoid metadata like "views • time ago"
                    !cleanText.includes('views') &&
                    !cleanText.includes('ago') &&
                    !cleanText.includes('subscribers') &&
                    !cleanText.includes('likes')) {
                    title = cleanText;
                    break;
                }
            }
            if (title) break;
        }

        // Special case: For thumbnail links, get the title attribute if it's a reasonable length
        if (!title) {
            const thumbnail = element.querySelector('a#thumbnail');
            if (thumbnail) {
                const thumbnailTitle = thumbnail.getAttribute('title') || '';
                const cleanThumbnailTitle = thumbnailTitle.trim();
                // Only use if it's a reasonable length for a title (not a full description)
                if (cleanThumbnailTitle.length > 5 && cleanThumbnailTitle.length < 120) {
                    title = cleanThumbnailTitle;
                }
            }
        }

        // Get channel name - text content only
        const channelSelectors = [
            'ytd-channel-name',
            '#channel-name',
            '.ytd-channel-name',
            '.metadata .byline'
        ];

        for (const selector of channelSelectors) {
            const el = element.querySelector(selector);
            if (el) {
                // Get ONLY text content, not any aria labels
                const channelText = el.textContent || el.innerText || '';
                const cleanChannel = channelText.replace(/\s+/g, ' ').trim();
                
                if (cleanChannel && 
                    cleanChannel.length > 1 && 
                    !cleanChannel.includes('•') && // Avoid metadata
                    !cleanChannel.includes('views') &&
                    !cleanChannel.includes('subscribers')) {
                    channel = cleanChannel;
                    break;
                }
            }
        }

        // Extract video ID
        const links = element.querySelectorAll('a[href*="/watch"]');
        for (const link of links) {
            if (link.href) {
                try {
                    const url = new URL(link.href);
                    const id = url.searchParams.get('v');
                    if (id) {
                        videoId = id;
                        break;
                    }
                } catch (e) {
                    const match = link.href.match(/[?&]v=([^&]+)/);
                    if (match) {
                        videoId = match[1];
                        break;
                    }
                }
            }
        }

        return { 
            title: title, 
            channel: channel, 
            videoId: videoId
        };
    }

    shouldAllowVideo(videoInfo) {
        // Check if video is already in allowed list
        if (videoInfo.videoId && this.allowedVideoIds.has(videoInfo.videoId)) {
            return true;
        }

        // Check channel - only if we have channel info
        if (videoInfo.channel && this.isAllowedChannel(videoInfo.channel)) {
            if (videoInfo.videoId) this.allowedVideoIds.add(videoInfo.videoId);
            return true;
        }

        // Check title - only if we have title info
        if (videoInfo.title && this.isAllowedByTitle(videoInfo.title)) {
            if (videoInfo.videoId) this.allowedVideoIds.add(videoInfo.videoId);
            return true;
        }

        return false;
    }

    filterAllVideos() {
        if (this.processing || Date.now() - this.lastRun < this.MIN_RUN_INTERVAL) {
            return;
        }
        
        this.processing = true;
        this.lastRun = Date.now();

        try {
            // Find all video elements
            const videoSelectors = [
                'ytd-rich-item-renderer',
                'ytd-video-renderer',
                'ytd-grid-video-renderer',
                'ytd-compact-video-renderer',
                'ytd-compact-playlist-renderer',
                'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer',
                'ytd-watch-card-compact-video-renderer',
                'ytd-compact-autoplay-renderer',
                'ytd-playlist-renderer',
                'ytd-playlist-video-renderer',
                'ytd-radio-renderer',
                '#contents ytd-video-renderer',
                '#items ytd-video-renderer',
                'ytd-item-section-renderer ytd-video-renderer'
            ].join(',');

            const videoElements = document.querySelectorAll(videoSelectors);
            let approvedCount = 0;
            let filteredCount = 0;

            videoElements.forEach(element => {
                // Skip if already processed
                if (element.hasAttribute('data-yt-filter-processed')) {
                    return;
                }

                const videoInfo = this.getVideoInfo(element);
                
                // Only make decision if we have at least title or channel info
                if (!videoInfo.title && !videoInfo.channel) {
                    // Not enough info to decide - keep hidden
                    return;
                }

                const shouldAllow = this.shouldAllowVideo(videoInfo);

                if (shouldAllow) {
                    // Add approved class to make visible
                    element.classList.add('yt-filter-approved');
                    approvedCount++;
                } else {
                    // Ensure it stays hidden
                    element.classList.remove('yt-filter-approved');
                    element.style.cssText = 'display: none !important; visibility: hidden !important;';
                    filteredCount++;
                }

                // Mark as processed
                element.setAttribute('data-yt-filter-processed', 'true');
            });

            // Also check current video if on watch page
            if (window.location.pathname.startsWith('/watch')) {
                this.checkCurrentVideo();
            }

            console.log(`YouTube Filter: Approved ${approvedCount}, Filtered ${filteredCount} videos`);
        } catch (error) {
            console.error('YouTube Filter error:', error);
        } finally {
            this.processing = false;
        }
    }

    checkCurrentVideo() {
        const currentVideoId = new URLSearchParams(window.location.search).get('v');
        
        // If no video ID in URL, we're not watching a video
        if (!currentVideoId) {
            return;
        }
        
        // If already allowed, skip
        if (this.allowedVideoIds.has(currentVideoId)) {
            return;
        }

        // Get current video title - ONLY from the main title element
        let title = '';
        const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer');
        if (titleElement) {
            // Get ONLY text content, not any attributes that might contain descriptions
            title = titleElement.textContent || titleElement.innerText || '';
            title = title.trim();
        }

        // Get current channel - ONLY from channel name element
        let channel = '';
        const channelElement = document.querySelector('ytd-channel-name a, #owner #channel-name a');
        if (channelElement) {
            // Get ONLY text content
            channel = channelElement.textContent || channelElement.innerText || '';
            channel = channel.trim();
        }

        // Only check if we have both video ID AND some title/channel info
        // This prevents warning when we're on a watch page but video hasn't loaded yet
        if (!title && !channel) {
            // Video info not loaded yet, wait and check again later
            setTimeout(() => this.checkCurrentVideo(), 1000);
            return;
        }

        const shouldAllow = this.isAllowedChannel(channel) || this.isAllowedByTitle(title);

        if (!shouldAllow) {
            // Video is not educational - show warning
            this.showRedirectWarning();
        } else {
            // Video is educational - add to allowed list
            this.allowedVideoIds.add(currentVideoId);
        }
    }

    showRedirectWarning() {
        // Remove any existing warning
        const existingWarning = document.getElementById('yt-filter-warning');
        if (existingWarning) return;

        const warning = document.createElement('div');
        warning.id = 'yt-filter-warning';
        warning.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 30px 40px;
            border-radius: 15px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            text-align: center;
            box-shadow: 0 5px 30px rgba(0,0,0,0.5);
            max-width: 400px;
            animation: fadeIn 0.3s ease;
        `;
        
        // Add fade-in animation
        const animationStyle = document.createElement('style');
        animationStyle.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -60%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
        `;
        document.head.appendChild(animationStyle);
        
        warning.innerHTML = `
            <h3 style="margin: 0 0 15px 0; font-size: 20px;">⛔ Non-Educational Content</h3>
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.4;">
                This video doesn't appear to be educational.<br>
                Redirecting to homepage in 3 seconds...
            </p>
        `;
        
        document.body.appendChild(warning);

        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'https://www.youtube.com/';
        }, 3000);
    }

    setupContentObserver() {
        // Create observer for dynamic content
        this.observer = new MutationObserver((mutations) => {
            let hasNewContent = false;
            
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    hasNewContent = true;
                    break;
                }
            }

            if (hasNewContent) {
                setTimeout(() => this.filterAllVideos(), 100);
            }
        });

        // Observe the entire document
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    setupSPADetection() {
        // Track URL changes for SPA navigation
        let lastUrl = window.location.href;
        
        const checkUrlChange = () => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                
                // Clear processing flags on navigation
                document.querySelectorAll('[data-yt-filter-processed]').forEach(el => {
                    el.removeAttribute('data-yt-filter-processed');
                });
                
                // Check current video only if we're on a watch page
                if (currentUrl.includes('/watch')) {
                    setTimeout(() => {
                        this.filterAllVideos();
                        this.checkCurrentVideo();
                    }, 1000);
                } else {
                    // On non-watch pages, just filter videos
                    setTimeout(() => this.filterAllVideos(), 1000);
                }
            }
        };
        
        // Check for URL changes periodically
        setInterval(checkUrlChange, 500);
    }

    runFilters() {
        this.filterAllVideos();
        // Only check current video if we're on a watch page
        if (window.location.pathname.startsWith('/watch')) {
            this.checkCurrentVideo();
        }
    }
}

// Initialize immediately
(function() {
    let filterInstance = null;
    
    function initializeFilter() {
        if (!filterInstance) {
            filterInstance = new YouTubeFilter();
            
            // Run filters multiple times with delays to catch all content
            setTimeout(() => filterInstance.runFilters(), 300);
            setTimeout(() => filterInstance.runFilters(), 1000);
            setTimeout(() => filterInstance.runFilters(), 2000);
            
            // Periodic safety check
            setInterval(() => filterInstance.filterAllVideos(), 3000);
        }
    }
    
    // Initialize based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFilter);
    } else {
        initializeFilter();
    }
    
    // Also initialize when YouTube's page manager is ready
    const checkYouTubeLoaded = setInterval(() => {
        if (document.querySelector('ytd-page-manager, ytd-app')) {
            initializeFilter();
            clearInterval(checkYouTubeLoaded);
        }
    }, 100);
})();
