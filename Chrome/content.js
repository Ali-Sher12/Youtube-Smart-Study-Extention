"use strict";

(function () {
    const { api, defaults } = self.STREAMLINE;

    // ---------------------------------------------------------------
    // Settings (kept in sync with the popup through storage)
    // ---------------------------------------------------------------
    let settings = { ...defaults };
    let channelRe = null;
    let keywordRe = null;

    const ON_CLASS = "yt-study-on";
    const APPROVED_CLASS = "yt-filter-approved";
    const FLAG = "data-yt-filter-processed";

    // Every kind of video / playlist card YouTube uses.
    const CARD_SELECTORS = [
        "ytd-rich-item-renderer",
        "ytd-video-renderer",
        "ytd-grid-video-renderer",
        "ytd-compact-video-renderer",
        "ytd-compact-playlist-renderer",
        "ytd-compact-radio-renderer",
        "ytd-compact-autoplay-renderer",
        "ytd-watch-card-compact-video-renderer",
        "ytd-playlist-renderer",
        "ytd-grid-playlist-renderer",
        "ytd-playlist-video-renderer",
        "ytd-playlist-panel-video-renderer",
        "ytd-radio-renderer",
        "ytd-grid-radio-renderer",
        "yt-lockup-view-model"
    ];

    // Hide every card that is not approved. Approved cards are left alone,
    // so YouTube's own layout (grid, flex) keeps working.
    const style = document.createElement("style");
    style.id = "yt-educational-filter-style";
    style.textContent =
        CARD_SELECTORS.map(s => `html.${ON_CLASS} ${s}:not(.${APPROVED_CLASS})`).join(",\n") +
        ` { display: none !important; }\n` +
        `html.${ON_CLASS} ytd-comments, html.${ON_CLASS} #comments { display: none !important; }\n` +
        `@keyframes yt-filter-fade { from { opacity: 0; } to { opacity: 1; } }`;
    document.documentElement.appendChild(style);
    // Start hidden to avoid a flash of content, settings load a moment later.
    document.documentElement.classList.add(ON_CLASS);

    // ---------------------------------------------------------------
    // Matching
    // ---------------------------------------------------------------
    function normalize(text) {
        return String(text || "")
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // Whole-word matching, so "mit" does not match "Smith" and "code" does not
    // match "decode". A trailing "s" is allowed ("lecture" matches "lectures").
    function buildMatcher(list) {
        const parts = list
            .map(normalize)
            .filter(Boolean)
            .map(term => {
                const body = escapeRegex(term);
                const endsWithWordChar = /[a-z0-9]$/.test(term);
                return "(?<![a-z0-9])" + body + (endsWithWordChar ? "s?(?![a-z0-9])" : "");
            });
        return parts.length ? new RegExp(parts.join("|"), "i") : null;
    }

    function filteringOn() {
        return Boolean(settings.onlyChannels || settings.onlyKeywords);
    }

    // Checked rules are combined with AND or OR (the popup's switch).
    // With only one box checked, that rule alone decides.
    function isAllowed(title, channel) {
        const results = [];
        if (settings.onlyChannels) {
            results.push(Boolean(channelRe && channel && channelRe.test(normalize(channel))));
        }
        if (settings.onlyKeywords) {
            results.push(Boolean(keywordRe && title && keywordRe.test(normalize(title))));
        }
        if (!results.length) return false;
        return settings.matchMode === "and" ? results.every(Boolean) : results.some(Boolean);
    }

    // ---------------------------------------------------------------
    // Reading a card
    // ---------------------------------------------------------------
    const META_RE = /•|\b(views?|subscribers?|likes?|watching)\b|\bago\b/i;

    function cleanText(el) {
        return ((el && (el.textContent || el.innerText)) || "").replace(/\s+/g, " ").trim();
    }

    // Title elements that really are titles (no metadata check needed).
    const STRONG_TITLE_SELECTORS = [
        "#video-title",
        "#video-title-link",
        ".yt-lockup-metadata-view-model-wiz__title",
        "h3 a",
        "h3"
    ];
    // Looser guesses, checked only if the strong ones found nothing.
    const LOOSE_TITLE_SELECTORS = [".title", "h2"];

    const CHANNEL_SELECTORS = [
        "ytd-channel-name",
        "#channel-name",
        ".ytd-channel-name",
        "#byline",
        ".metadata .byline",
        'a[href^="/@"]',
        'a[href^="/channel/"]',
        'a[href^="/c/"]',
        'a[href^="/user/"]'
    ];

    function pageChannel() {
        // On a channel page the cards do not repeat the channel name,
        // so use the channel the page belongs to.
        if (/^\/(@|channel\/|c\/|user\/)/.test(location.pathname)) {
            return stripTitle(document.title);
        }
        return "";
    }

    function stripTitle(t) {
        return (t || "").replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube$/, "").trim();
    }

    function getCardInfo(card) {
        let title = "";
        let channel = "";

        for (const sel of STRONG_TITLE_SELECTORS) {
            for (const el of card.querySelectorAll(sel)) {
                const t = cleanText(el);
                if (t.length > 2 && t.length < 200) { title = t; break; }
            }
            if (title) break;
        }

        if (!title) {
            for (const sel of LOOSE_TITLE_SELECTORS) {
                for (const el of card.querySelectorAll(sel)) {
                    const t = cleanText(el);
                    if (t.length > 5 && t.length < 150 && !META_RE.test(t)) { title = t; break; }
                }
                if (title) break;
            }
        }

        if (!title) {
            // Last resort: a link with a title attribute (thumbnails, playlists).
            for (const a of card.querySelectorAll("a[title]")) {
                const t = (a.getAttribute("title") || "").trim();
                if (t.length > 5 && t.length < 150) { title = t; break; }
            }
        }

        for (const sel of CHANNEL_SELECTORS) {
            for (const el of card.querySelectorAll(sel)) {
                const t = cleanText(el);
                if (t.length > 1 && !META_RE.test(t)) { channel = t; break; }
            }
            if (channel) break;
        }

        if (!channel) {
            // Newer card layout: first metadata line is usually the channel.
            for (const el of card.querySelectorAll(".yt-content-metadata-view-model-wiz__metadata-text")) {
                const t = cleanText(el);
                if (t.length > 1 && !META_RE.test(t)) { channel = t; break; }
            }
        }

        if (!channel) channel = pageChannel();

        return { title, channel };
    }

    // ---------------------------------------------------------------
    // Filtering the lists
    // ---------------------------------------------------------------
    function filterAllVideos() {
        if (!filteringOn()) return;

        const cards = document.querySelectorAll(CARD_SELECTORS.join(","));
        for (const card of cards) {
            if (card.hasAttribute(FLAG)) continue;

            const { title, channel } = getCardInfo(card);
            if (!title && !channel) continue; // nothing loaded yet, stay hidden and retry

            if (isAllowed(title, channel)) {
                card.classList.add(APPROVED_CLASS);
                card.setAttribute(FLAG, "approved");
                continue;
            }

            // Not allowed. Only call it final once we have what the active rules need,
            // otherwise a late-loading title would get blocked for good.
            const haveEverything =
                (!settings.onlyKeywords || title) &&
                (!settings.onlyChannels || channel);
            if (haveEverything) {
                card.classList.remove(APPROVED_CLASS);
                card.setAttribute(FLAG, "blocked");
            }
        }
    }

    function resetCards() {
        for (const card of document.querySelectorAll(`[${FLAG}]`)) {
            card.removeAttribute(FLAG);
            card.classList.remove(APPROVED_CLASS);
        }
    }

    // One run after things go quiet (a trailing run, so nothing is skipped).
    let timer = null;
    function schedule(delay = 150) {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            filterAllVideos();
        }, delay);
    }

    // ---------------------------------------------------------------
    // The video you are watching right now
    // ---------------------------------------------------------------
    const WATCH_TITLE_SELECTORS = [
        "ytd-watch-metadata h1",
        "h1.ytd-watch-metadata",
        "h1.ytd-video-primary-info-renderer",
        "#title h1"
    ];
    const WATCH_CHANNEL_SELECTORS = [
        "ytd-watch-metadata ytd-channel-name a",
        "#owner ytd-channel-name a",
        "ytd-video-owner-renderer ytd-channel-name a",
        "#upload-info ytd-channel-name a",
        "#owner #channel-name a",
        '#owner a[href^="/@"]'
    ];

    function firstText(selectors) {
        for (const sel of selectors) {
            const t = cleanText(document.querySelector(sel));
            if (t) return t;
        }
        return "";
    }

    function currentVideoId() {
        return new URLSearchParams(location.search).get("v");
    }

    let checkToken = 0;
    function checkCurrentVideo() {
        const token = ++checkToken;
        let attempts = 0;

        const tick = () => {
            if (token !== checkToken) return; // a newer check took over

            if (!filteringOn() || !location.pathname.startsWith("/watch")) {
                removeWarning();
                return;
            }

            const id = currentVideoId();
            if (!id) return;

            // Make sure the page has actually switched to this video,
            // so we never judge the previous video's title.
            const flexy = document.querySelector("ytd-watch-flexy");
            const idOk = !flexy || !flexy.hasAttribute("video-id") || flexy.getAttribute("video-id") === id;

            const title = firstText(WATCH_TITLE_SELECTORS) || stripTitle(document.title);
            const channel = firstText(WATCH_CHANNEL_SELECTORS);

            if (idOk && isAllowed(title, channel)) {
                removeWarning();
                return;
            }

            const ready =
                idOk &&
                (!settings.onlyKeywords || title) &&
                (!settings.onlyChannels || channel);

            if (ready) {
                showRedirectWarning(id);
                return;
            }

            // Page still loading. Try again a few times, then give up without blocking.
            if (++attempts < 20) setTimeout(tick, 500);
        };

        tick();
    }

    function removeWarning() {
        const w = document.getElementById("yt-filter-warning");
        if (w) w.remove();
    }

    function showRedirectWarning(videoId) {
        if (document.getElementById("yt-filter-warning")) return;

        const video = document.querySelector("video");
        if (video) video.pause();

        const warning = document.createElement("div");
        warning.id = "yt-filter-warning";
        warning.style.cssText = `
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #c62828; color: #fff;
            padding: 28px 36px; border-radius: 12px;
            z-index: 2147483647;
            font-family: Arial, sans-serif; text-align: center;
            box-shadow: 0 6px 30px rgba(0,0,0,0.5);
            max-width: 400px;
            animation: yt-filter-fade 0.3s ease;
        `;

        const h = document.createElement("h3");
        h.style.cssText = "margin: 0 0 12px 0; font-size: 20px;";
        h.textContent = "Not on your list";
        const p = document.createElement("p");
        p.style.cssText = "margin: 0; font-size: 16px; line-height: 1.4;";
        p.textContent = "This video doesn't match your allowed channels or keywords. Going back to the homepage in 3 seconds.";
        warning.append(h, p);
        document.documentElement.appendChild(warning);

        setTimeout(() => {
            // Only redirect if we are still on the same blocked video.
            if (document.getElementById("yt-filter-warning") && currentVideoId() === videoId) {
                location.href = "https://www.youtube.com/";
            } else {
                removeWarning();
            }
        }, 3000);
    }

    // ---------------------------------------------------------------
    // Keeping up with YouTube (it never reloads the page)
    // ---------------------------------------------------------------
    function onNavigate() {
        removeWarning();
        resetCards();
        schedule(300);
        checkCurrentVideo();
    }

    function setup() {
        new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.addedNodes.length) { schedule(); return; }
            }
        }).observe(document.documentElement, { childList: true, subtree: true });

        document.addEventListener("yt-navigate-finish", onNavigate);

        // Backup in case that event ever changes.
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                onNavigate();
            }
        }, 1000);

        // Safety net for late-loading content.
        setInterval(filterAllVideos, 3000);
    }

    // ---------------------------------------------------------------
    // Start
    // ---------------------------------------------------------------
    function applySettings() {
        channelRe = buildMatcher(settings.channels || []);
        keywordRe = buildMatcher(settings.keywords || []);
        document.documentElement.classList.toggle(ON_CLASS, filteringOn());
        resetCards();
        removeWarning();
        checkCurrentVideo();
        schedule(0);
    }

    api.storage.local.get(defaults).then(stored => {
        settings = { ...defaults, ...stored };
        applySettings();
    }).catch(() => applySettings());

    api.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        for (const key of Object.keys(changes)) {
            settings[key] = "newValue" in changes[key] ? changes[key].newValue : defaults[key];
        }
        applySettings();
    });

    setup();
})();
