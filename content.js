"use strict"; //chatGPT said to use this

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
    "syllabus",
    "discussion"
];

const ALLOWED_CHANNELS = [ // if the video belongs to this channel then automatically allowed.
    "jenny's lectures cs it",
    "gate smashers",
    "abdul bari"
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

function blockCommentsSection() {// blocking the comment section because why not
    const comments = document.querySelector("ytd-comments");
    if (comments) {
        comments.style.display = "none";
    }
}

function enforceCurrentlyPlayingVideoPolicy() {
    if (!location.pathname.startsWith("/watch")) return;

    const titleElement = document.querySelector("h1 yt-formatted-string");
    const channelElement = document.querySelector(
        "ytd-channel-name a, ytd-channel-name yt-formatted-string"
    );

    const titleText = titleElement ? titleElement.textContent.trim() : "";
    const channelText = channelElement ? channelElement.textContent.trim() : "";

    const allowed =
        isAllowedChannel(channelText) ||
        isAllowedByTitle(titleText);

    if (!allowed) {
        window.location.href = "https://www.youtube.com/";
    }
}

filterVideoTiles();
blockCommentsSection();
enforceCurrentlyPlayingVideoPolicy();

//Thanks chatGPT for adding ts function
const observer = new MutationObserver(() => {
    filterVideoTiles();
    blockCommentsSection();
    enforceCurrentlyPlayingVideoPolicy();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

