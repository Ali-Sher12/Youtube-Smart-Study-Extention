"use strict";

// Shared by the content script and the popup.
// Works in both Chrome ("chrome") and Firefox ("browser").
self.STREAMLINE = {
    api: typeof browser !== "undefined" ? browser : chrome,
    defaults: {
        onlyChannels: true,
        onlyKeywords: true,
        matchMode: "or",
        channels: [
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
        ],
        keywords: [
            "topic",
            "lecture",
            "course",
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
            "software",
            "syllabus",
            "discussion",
            "java",
            "python",
            "c++"
        ]
    }
};
