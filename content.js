"use strict";

/*
  This script hides all video tiles on YouTube
  Home and Search pages by removing video-renderer elements.
*/

function blockAllVideos() {
    /* YouTube video containers on Home and Search pages */
    const videoSelectors = [
        "ytd-rich-item-renderer",     // Home page videos
        "ytd-video-renderer",         // Search results videos
        "ytd-grid-video-renderer",    // Channel grids
        "ytd-compact-video-renderer"  // Sidebar suggestions
    ];

    videoSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(video => {
            video.style.display = "none";
        });
    });
}

/* Run once on initial load */
blockAllVideos();

/*
  YouTube is a Single Page Application (SPA).
  New videos load dynamically, so we observe DOM mutations.
*/
const observer = new MutationObserver(() => {
    blockAllVideos();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

