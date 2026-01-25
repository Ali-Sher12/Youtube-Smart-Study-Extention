"use strict";

const ALLOWED_KEYWORDS = [
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
    "playlist",
    "#jennyslectures",
    "gate",
    "database",
    "university",
    "courseware",
    "system",
    "management",
    "placement",
    "programming",
    "code",
    "coding",
    "lec-",
    "lec#",
    "college",
    "student",
    "students",
    "software",
    "engineering",
    "syllabus",
    "discussion"
];

const ALLOWED_CHANNELS = [
    "Jenny's Lectures CS IT",
    "Gate Smashers",
    "Abdul Bari"
];

function isAllowedChannel(channelName) {
    if (!channelName) return false;
    return ALLOWED_CHANNELS.includes(channelName.toLowerCase());
}

function isAllowedByTitle(title) {
    if (!title) return false;

    const normalizedTitle = title.toLowerCase();

    return ALLOWED_KEYWORDS.some(keyword =>
        normalizedTitle.includes(keyword)
    );
}

function filterVideoTiles() {
    const videoRenderers = document.querySelectorAll(
        "ytd-rich-item-renderer, ytd-video-renderer"
    );

    videoRenderers.forEach(video => {
        const titleElement = video.querySelector("#video-title");
        const channelElement = video.querySelector(
            "ytd-channel-name a, ytd-channel-name yt-formatted-string"
        );

        const titleText = titleElement ? titleElement.textContent.trim() : "";
        const channelText = channelElement ? channelElement.textContent.trim() : "";

        const allowed =
            isAllowedChannel(channelText) ||
            isAllowedByTitle(titleText);

        if (!allowed) {
            video.style.display = "none";
        }
    });
}

function blockCommentsSection() {
    const comments = document.querySelector("ytd-comments");
    if (comments) {
        comments.style.display = "none";
    }
}

filterVideoTiles();
blockCommentsSection();

const observer = new MutationObserver(() => {
    filterVideoTiles();
    blockCommentsSection();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

