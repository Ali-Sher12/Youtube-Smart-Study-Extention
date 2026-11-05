"use strict";

(function () {
    const { api, defaults } = self.STREAMLINE;

    let state = { ...defaults };

    const $ = id => document.getElementById(id);

    function normalize(text) {
        return text.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function save(patch) {
        Object.assign(state, patch);
        return api.storage.local.set(patch);
    }

    function renderList(ul, key, emptyText) {
        ul.textContent = "";
        const items = state[key];

        if (!items.length) {
            const li = document.createElement("li");
            li.className = "empty";
            li.textContent = emptyText;
            ul.appendChild(li);
            return;
        }

        for (const item of items) {
            const li = document.createElement("li");
            const label = document.createElement("span");
            label.textContent = item;

            const remove = document.createElement("button");
            remove.type = "button";
            remove.textContent = "\u00d7";
            remove.setAttribute("aria-label", "Remove " + item);
            remove.addEventListener("click", async () => {
                await save({ [key]: state[key].filter(x => x !== item) });
                render();
            });

            li.append(label, remove);
            ul.appendChild(li);
        }
    }

    function summaryText() {
        if (state.onlyChannels && state.onlyKeywords) {
            return state.matchMode === "and"
                ? "A video is shown only if its channel and its title both match."
                : "A video is shown if its channel or its title matches.";
        }
        if (state.onlyChannels) return "Only videos from these channels are shown.";
        if (state.onlyKeywords) return "Only videos with these keywords in the title are shown.";
        return "Filtering is off. YouTube works as normal.";
    }

    function render() {
        $("onlyChannels").checked = state.onlyChannels;
        $("onlyKeywords").checked = state.onlyKeywords;
        $("channelsSection").classList.toggle("off", !state.onlyChannels);
        $("keywordsSection").classList.toggle("off", !state.onlyKeywords);
        $("modeGroup").classList.toggle("dim", !(state.onlyChannels && state.onlyKeywords));
        for (const radio of document.querySelectorAll('input[name="matchMode"]')) {
            radio.checked = radio.value === state.matchMode;
        }
        $("summary").textContent = summaryText();
        renderList($("channelList"), "channels", "No channels yet.");
        renderList($("keywordList"), "keywords", "No keywords yet.");
    }

    // Accepts one or many entries: separate them with new lines or commas.
    function parseEntries(text) {
        return text.split(/[\n,]+/).map(normalize).filter(Boolean);
    }

    function wireAdd(formId, inputId, key) {
        const form = $(formId);
        const input = $(inputId);

        async function add() {
            const fresh = [];
            for (const entry of parseEntries(input.value)) {
                if (!state[key].includes(entry) && !fresh.includes(entry)) fresh.push(entry);
            }
            input.value = "";
            if (!fresh.length) return;
            await save({ [key]: [...state[key], ...fresh] });
            render();
        }

        form.addEventListener("submit", event => {
            event.preventDefault();
            add();
        });

        // Enter adds a new line, Ctrl+Enter (or Cmd+Enter) adds everything.
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                add();
            }
        });
    }

    async function init() {
        try {
            const stored = await api.storage.local.get(defaults);
            state = { ...defaults, ...stored };
        } catch (e) {
            state = { ...defaults };
        }

        $("onlyChannels").addEventListener("change", async event => {
            await save({ onlyChannels: event.target.checked });
            render();
        });
        $("onlyKeywords").addEventListener("change", async event => {
            await save({ onlyKeywords: event.target.checked });
            render();
        });

        for (const radio of document.querySelectorAll('input[name="matchMode"]')) {
            radio.addEventListener("change", async event => {
                if (!event.target.checked) return;
                await save({ matchMode: event.target.value });
                render();
            });
        }

        wireAdd("channelForm", "channelInput", "channels");
        wireAdd("keywordForm", "keywordInput", "keywords");

        $("reset").addEventListener("click", async () => {
            if (!confirm("Reset the channel list, keyword list and both checkboxes to their defaults?")) return;
            await save({
                onlyChannels: defaults.onlyChannels,
                onlyKeywords: defaults.onlyKeywords,
                matchMode: defaults.matchMode,
                channels: [...defaults.channels],
                keywords: [...defaults.keywords]
            });
            render();
        });

        render();
    }

    init();
})();
