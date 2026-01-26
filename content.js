"use strict";

/*
  Allowed keywords indicating lectures or structured courses.
  All keywords are lowercase to guarantee case-insensitive substring matching.
*/
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

/*
  Allowed channels.
  Videos from these channels are always allowed.
*/
const ALLOWED_CHANNELS = [
    "jenny's lectures cs it",
    "gate smashers",
    "abdul bari"
];

/*
  Checks whether the channel is explicitly allowed.
*/
function isAllowedChannel(channelName) {
    if (!channelName) return false;
    return ALLOWED_CHANNELS.includes(channelName.toLowerCase());
}

/*
  Checks whether the video title matches allowed keywords
  (case-insensitive substring matching).
*/
function isAllowedByTitle(title) {
    if (!title) return false;

    const normalizedTitle = title.toLowerCase();

    return ALLOWED_KEYWORDS.some(keyword =>
        normalizedTitle.includes(keyword)
    );
}

/*
  Filters video tiles on Home and Search pages.
*/
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

/*
  Blocks the comment section on allowed videos.
*/
function blockCommentsSection() {
    const comments = document.querySelector("ytd-comments");
    if (comments) {
        comments.style.display = "none";
    }
}

/*
  Enforces policy for the currently playing video.
  If the video is not allowed, redirect to YouTube home.
*/
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

/*
  Initial execution
*/
filterVideoTiles();
blockCommentsSection();
enforceCurrentlyPlayingVideoPolicy();

/*
  Observe DOM mutations to handle YouTube SPA behavior.
*/
const observer = new MutationObserver(() => {
    filterVideoTiles();
    blockCommentsSection();
    enforceCurrentlyPlayingVideoPolicy();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

