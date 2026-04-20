(() => {
    "use strict";

    const STORAGE_KEYS = {
        theme: "xclone-theme",
        likes: "xclone-liked-tweets",
        chat: "xclone-chat-messages",
    };

    const THEME = {
        dark: "dark",
        light: "light"
    };

    const body = document.body;
    const html = document.documentElement;
    const themeToggleButton = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const feed = document.getElementById("feed");
    const tweetTextInput = document.getElementById("tweetText");
    const postButton = document.getElementById("postBtn");
    const composeNavButton = document.getElementById("composeBtn");
    const floatingChatButton = document.querySelector("#support-buttons .new-chat");
    const floatingGrokButton = document.querySelector("#support-buttons .grok");

    let chatPanel = null;
    let chatBody = null;
    let chatInput = null;
    let chatMessages = [];
    let grokPanel = null;
    let grokInput = null;

    const loadJson = (key, fallback) => {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            return fallback;
        }
    };

    const saveJson = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            // Ignore storage errors (private mode/quota/security settings).
        }
    };

    const parseCountText = (rawText) => {
        const text = (rawText || "").trim().toUpperCase();
        const match = text.match(/^([\d,.]*\.?\d+)\s*([KMB])?$/i);

        if (!match) {
            return Number.NaN;
        }

        const numericPart = Number(match[1].replace(/,/g, ""));
        if (!Number.isFinite(numericPart)) {
            return Number.NaN;
        }

        const suffix = match[2] || "";
        const multiplier =
            suffix === "K" ? 1_000 :
            suffix === "M" ? 1_000_000 :
            suffix === "B" ? 1_000_000_000 :
            1;

        return Math.round(numericPart * multiplier);
    };

    const formatCount = (value) => {
        if (!Number.isFinite(value)) {
            return "";
        }

        const absValue = Math.abs(value);
        const formatWithSuffix = (divisor, suffix) => {
            const short = value / divisor;
            const rounded = short >= 100 ? Math.round(short) : Number(short.toFixed(1));
            return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}${suffix}`;
        };

        if (absValue >= 1_000_000_000) return formatWithSuffix(1_000_000_000, "B");
        if (absValue >= 1_000_000) return formatWithSuffix(1_000_000, "M");
        if (absValue >= 1_000) return formatWithSuffix(1_000, "K");
        return String(Math.round(value));
    };

    const escapeHtml = (text) => {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    const formatPostText = (text) => {
        return escapeHtml(text).replace(/\n/g, "<br>");
    };

    const ensureTweetId = (tweetElement) => {
        if (!tweetElement.dataset.tweetId) {
            tweetElement.dataset.tweetId = `tweet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }
        return tweetElement.dataset.tweetId;
    };

    const initializeTweetLikeButton = (tweetElement) => {
        ensureTweetId(tweetElement);
        const likeButton = tweetElement.querySelector('.action-btn[aria-label="Like"]');
        if (!likeButton) return;

        const countElement = likeButton.querySelector(".count");
        const baseCount = parseCountText(countElement?.textContent || "");
        likeButton.dataset.baseCount = Number.isFinite(baseCount) ? String(baseCount) : "0";
    };

    const createTweetElement = (text) => {
        const article = document.createElement("article");
        article.className = "tweet";
        article.innerHTML = `
            <div class="row">
                <div class="avatar-img-1" aria-hidden="true" style="width:44px;height:44px;"></div>
                <div class="content">
                    <div class="tweet-head">
                        <div class="tweet-who">
                            <span class="name">Khumo Mpshe</span>
                            <span class="verified material-icons" aria-label="Verified">verified</span>
                            <span class="handle">@khumompshe</span>
                            <span class="dot">&middot;</span>
                            <span class="time">now</span>
                        </div>
                        <div class="tweet-more" aria-label="Tweet actions">
                            <button class="ghost-icon" type="button" aria-label="More">
                                <span class="material-icons" aria-hidden="true">more_horiz</span>
                            </button>
                        </div>
                    </div>
                    <p>${formatPostText(text)}</p>
                    <div class="tweet-actions" aria-label="Post actions">
                        <button class="action-btn" type="button" aria-label="Reply">
                            <span class="material-icons" aria-hidden="true">chat_bubble_outline</span>
                            <span class="count">0</span>
                        </button>
                        <button class="action-btn" type="button" aria-label="Repost">
                            <span class="material-icons" aria-hidden="true">repeat</span>
                            <span class="count">0</span>
                        </button>
                        <button class="action-btn" type="button" aria-label="Like">
                            <span class="material-icons" aria-hidden="true">favorite_border</span>
                            <span class="count">0</span>
                        </button>
                        <button class="action-btn" type="button" aria-label="Views">
                            <span class="material-icons" aria-hidden="true">bar_chart</span>
                            <span class="count">0</span>
                        </button>
                        <div class="action-spacer"></div>
                        <button class="action-btn" type="button" aria-label="Bookmark">
                            <span class="material-icons" aria-hidden="true">bookmark_border</span>
                        </button>
                        <button class="action-btn" type="button" aria-label="Share">
                            <span class="material-icons" aria-hidden="true">ios_share</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        return article;
    };

    const getTweetId = (tweetElement, index) => {
        if (tweetElement.dataset.tweetId) {
            return tweetElement.dataset.tweetId;
        }

        const time = tweetElement.querySelector(".time")?.textContent?.trim() || "";
        const handle = tweetElement.querySelector(".handle")?.textContent?.trim() || "";
        return `${index}-${handle}-${time}`;
    };

    const setTheme = (theme) => {
        const isDark = theme === THEME.dark;

        body.classList.toggle("dark-mode", isDark);
        html.setAttribute("data-theme", isDark ? THEME.dark : THEME.light);

        if (themeIcon) {
            themeIcon.textContent = isDark ? "light_mode" : "dark_mode";
        }

        if (themeToggleButton) {
            themeToggleButton.setAttribute(
                "aria-label",
                isDark ? "Switch to light mode" : "Switch to dark mode"
            );
        }

        localStorage.setItem(STORAGE_KEYS.theme, isDark ? THEME.dark : THEME.light);
    };

    const initializeTheme = () => {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
        if (savedTheme === THEME.dark || savedTheme === THEME.light) {
            setTheme(savedTheme);
            return;
        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? THEME.dark : THEME.light);
    };

    const setLikeUI = (button, isLiked) => {
        button.classList.toggle("liked", isLiked);
        button.setAttribute("aria-pressed", String(isLiked));

        const icon = button.querySelector(".material-icons");
        if (icon) {
            icon.textContent = isLiked ? "favorite" : "favorite_border";
            icon.style.color = isLiked ? "#f91880" : "";
        }
    };

    const applyLikeCount = (button, isLiked) => {
        const countElement = button.querySelector(".count");
        if (!countElement) return;

        const baseCount = Number(button.dataset.baseCount);
        if (!Number.isFinite(baseCount)) return;

        const currentCount = isLiked ? baseCount + 1 : baseCount;
        countElement.textContent = formatCount(currentCount);
    };

    const initializeTweets = () => {
        if (!feed) return [];

        const likedTweetIds = new Set(loadJson(STORAGE_KEYS.likes, []));
        const tweets = [...feed.querySelectorAll(".tweet")];

        tweets.forEach((tweet, index) => {
            tweet.dataset.tweetId = getTweetId(tweet, index);

            const likeButton = tweet.querySelector('.action-btn[aria-label="Like"]');
            if (!likeButton) return;

            const countElement = likeButton.querySelector(".count");
            const baseCount = parseCountText(countElement?.textContent || "");
            likeButton.dataset.baseCount = Number.isFinite(baseCount) ? String(baseCount) : "";

            const liked = likedTweetIds.has(tweet.dataset.tweetId);
            setLikeUI(likeButton, liked);
            applyLikeCount(likeButton, liked);
        });

        return tweets;
    };

    const updatePostButtonState = () => {
        if (!postButton || !tweetTextInput) return;
        postButton.disabled = tweetTextInput.value.trim().length === 0;
    };

    const submitComposerPost = () => {
        if (!feed || !tweetTextInput) return;

        const text = tweetTextInput.value.trim();
        if (!text) {
            updatePostButtonState();
            tweetTextInput.focus();
            return;
        }

        const tweetElement = createTweetElement(text);
        initializeTweetLikeButton(tweetElement);
        feed.prepend(tweetElement);

        tweetTextInput.value = "";
        updatePostButtonState();
        tweetTextInput.focus();
    };


    const injectChatStyles = () => {
        if (document.getElementById("chatPanelStyles")) return;

        const style = document.createElement("style");
        style.id = "chatPanelStyles";
        style.textContent = `
            .chat-panel {
                position: fixed;
                right: 22px;
                bottom: 96px;
                width: min(380px, calc(100vw - 24px));
                height: 520px;
                background: #000;
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: 16px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
                z-index: 60;
                transform: translateY(16px);
                opacity: 0;
                pointer-events: none;
                transition: opacity 160ms ease, transform 160ms ease;
            }

            .chat-panel.open {
                transform: translateY(0);
                opacity: 1;
                pointer-events: auto;
            }

            .chat-panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 14px 8px;
                font-weight: 700;
                color: #f7f9f9;
            }

            .chat-panel-title {
                font-size: 20px;
                line-height: 1;
                margin: 0;
                font-weight: 800;
            }

            .chat-panel-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .chat-filter {
                border: 1px solid var(--border, rgba(255,255,255,0.16));
                border-radius: 999px;
                height: 36px;
                padding: 0 14px;
                color: #f7f9f9;
                background: transparent;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-weight: 700;
                font-size: 18px;
            }

            .chat-filter .material-icons {
                font-size: 16px;
                color: #71767b;
            }

            .chat-control-btn {
                border: 0;
                background: transparent;
                color: #f7f9f9;
                width: 36px;
                height: 36px;
                border: 1px solid var(--border, rgba(255,255,255,0.16));
                border-radius: 999px;
                display: grid;
                place-items: center;
            }

            .chat-control-btn .material-icons {
                font-size: 18px;
            }

            .chat-control-btn:hover,
            .chat-filter:hover {
                background: var(--hover-bg, rgba(255,255,255,0.06));
            }

            .chat-search-wrap {
                padding: 10px 14px 14px;
            }

            .chat-search {
                width: 100%;
                height: 46px;
                border-radius: 999px;
                border: 0;
                background: #171f2a;
                color: #f7f9f9;
                padding: 0 16px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .chat-search .material-icons {
                color: #6e7f92;
                font-size: 22px;
            }

            .chat-search input {
                flex: 1;
                border: 0;
                background: transparent;
                color: #f7f9f9;
                outline: none;
                font-size: 16px;
            }

            .chat-search input::placeholder {
                color: #6e7f92;
            }

            .chat-panel-body {
                flex: 1;
                overflow: auto;
                padding: 14px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .chat-empty {
                margin: auto;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                color: #f7f9f9;
                transform: translateY(-30px);
            }

            .chat-empty .material-icons {
                font-size: 72px;
                margin-bottom: 12px;
            }

            .chat-empty-title {
                font-size: 20px;
                font-weight: 700;
                line-height: 1.05;
                margin: 0;
            }

            .chat-empty-sub {
                margin-top: 8px;
                color: #71767b;
                font-size: 20px;
            }

            .chat-message {
                max-width: 85%;
                padding: 12px 14px;
                border-radius: 14px;
                font-size: 14px;
                line-height: 1.35;
                word-break: break-word;
            }

            .chat-message.mine {
                margin-left: auto;
                background: #1d9bf0;
                color: #fff;
                border-bottom-right-radius: 6px;
            }

            .chat-message.bot {
                margin-right: auto;
                background: rgba(255, 255, 255, 0.08);
                color: var(--text, #e7e7e7);
                border-bottom-left-radius: 6px;
            }

            .chat-panel-footer {
                display: flex;
                gap: 8px;
                padding: 10px 12px;
                border-top: 1px solid var(--border, rgba(255,255,255,0.08));
            }

            .chat-panel-input {
                flex: 1;
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: 999px;
                padding: 9px 12px;
                background: transparent;
                color: var(--text, #e7e7e7);
                outline: none;
                font-size: 14px;
            }

            .chat-panel-send {
                border: 0;
                border-radius: 999px;
                padding: 0 16px;
                background: #1d9bf0;
                color: #fff;
                font-weight: 700;
            }
        `;

        document.head.appendChild(style);
    };

    const injectTweetMenuStyles = () => {
        if (document.getElementById("tweetMenuStyles")) return;

        const style = document.createElement("style");
        style.id = "tweetMenuStyles";
        style.textContent = `
            .tweet-more {
                position: relative;
            }

            .tweet-more-menu {
                position: absolute;
                top: 34px;
                right: 0;
                min-width: 180px;
                border-radius: 14px;
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                background: var(--panel-2, #0f1115);
                box-shadow: 0 12px 30px rgba(0,0,0,0.35);
                padding: 6px;
                z-index: 20;
            }

            .tweet-more-menu button {
                width: 100%;
                border: 0;
                background: transparent;
                color: var(--text, #e7e7e7);
                padding: 10px 12px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
                text-align: left;
                font-weight: 600;
            }

            .tweet-more-menu button:hover {
                background: var(--hover-bg, rgba(255,255,255,0.06));
            }

            .tweet-more-menu button.delete {
                color: #f4212e;
            }
        `;

        document.head.appendChild(style);
    };

    const injectGrokStyles = () => {
        if (document.getElementById("grokPanelStyles")) return;

        const style = document.createElement("style");
        style.id = "grokPanelStyles";
        style.textContent = `
            .grok-panel {
                position: fixed;
                right: 22px;
                bottom: 96.6px;
                width: min(460px, calc(100vw - 24px));
                min-height: 364.8px;
                border-radius: 22px;
                border: 1px solid rgba(255, 255, 255, 0.14);
                background: radial-gradient(circle at 50% -30%, rgba(83, 123, 255, 0.2), transparent 45%), #000;
                box-shadow: 0 16px 42px rgba(0, 0, 0, 0.52);
                z-index: 70;
                color: #f6f7f9;
                padding: 14px 16px 16px;
                transform: translateY(14px);
                opacity: 0;
                pointer-events: none;
                transition: opacity 160ms ease, transform 160ms ease;
            }

            .grok-panel.open {
                transform: translateY(0);
                opacity: 1;
                pointer-events: auto;
            }

            .grok-panel-header {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 12px;
                margin-bottom: 14px;
            }

            .grok-icon-btn {
                width: 32px;
                height: 32px;
                border-radius: 999px;
                border: 0;
                background: transparent;
                color: #f6f7f9;
                display: grid;
                place-items: center;
                cursor: pointer;
            }

            .grok-icon-btn:hover {
                background: rgba(255, 255, 255, 0.08);
            }

            .grok-icon-btn .material-icons {
                font-size: 18px;
                line-height: 1;
            }

            .grok-title {
                margin: 4px 0 48px;
                text-align: center;
                font-size: 26px;
                font-weight: 600;
                line-height: 1.1;
                letter-spacing: -0.02em;
            }

            .grok-composer {
                border: 1px solid rgba(255, 255, 255, 0.14);
                border-radius: 22px;
                padding: 12px 14px 10px;
                background: rgba(13, 15, 22, 0.72);
            }

            .grok-input {
                width: 100%;
                border: 0;
                background: transparent;
                color: #f6f7f9;
                font-size: 16px;
                line-height: 1.25;
                outline: none;
            }

            .grok-input::placeholder {
                color: #9da2ad;
            }

            .grok-composer-row {
                margin-top: 6px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
            }

            .grok-left-tools {
                display: inline-flex;
                align-items: center;
                gap: 250px;
                color: #d7dbe1;
                hover: pointer;
            }

            .grok-mode {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-size: 18px;
                font-weight: 600;
                hover: pointer;
            }

            .grok-send {
                width: 42px;
                height: 42px;
                border-radius: 999px;
                border: 0;
                background: #fff;
                color: #0f1115;
                display: grid;
                place-items: center;
                hover: pointer;
            }

            .grok-send .material-icons {
                font-size: 20px;
            }

            .grok-actions {
                margin-top: 12px;
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px;
            }

            .grok-chip {
                border: 1px solid rgba(255, 255, 255, 0.16);
                border-radius: 999px;
                height: 36px;
                padding: 0 12px;
                background: rgba(255, 255, 255, 0.02);
                color: #dfe3e9;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 16px;
                font-weight: 600;
            }

            .grok-chip .material-icons {
                font-size: 16px;
            }

            @media (max-width: 700px) {
                .grok-panel {
                    right: 12px;
                    left: 12px;
                    width: auto;
                    bottom: 86px;
                    min-height: 320px;
                }
                .grok-title { font-size: 22px; }
                .grok-input { font-size: 16px; }
                .grok-mode, .grok-chip { font-size: 14px; }
            }
        `;

        document.head.appendChild(style);
    };

    const renderChatMessages = () => {
        if (!chatBody) return;

        chatBody.innerHTML = "";
        if (chatMessages.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "chat-empty";
            emptyState.innerHTML = `
                <span class="material-icons" aria-hidden="true">chat_bubble_outline</span>
                <p class="chat-empty-title">Empty inbox</p>
                <p class="chat-empty-sub">Message someone</p>
            `;
            chatBody.appendChild(emptyState);
            return;
        }

        chatMessages.forEach((message) => {
            const bubble = document.createElement("div");
            bubble.className = `chat-message ${message.from}`;
            bubble.textContent = message.text;
            chatBody.appendChild(bubble);
        });

        chatBody.scrollTop = chatBody.scrollHeight;
    };

    const saveChatMessages = () => {
        saveJson(STORAGE_KEYS.chat, chatMessages);
    };

    const sendChatMessage = (text, from = "mine") => {
        const cleaned = text.trim();
        if (!cleaned) return;

        chatMessages.push({ from, text: cleaned, ts: Date.now() });
        chatMessages = chatMessages.slice(-80);
        saveChatMessages();
        renderChatMessages();
    };

    const buildChatPanel = () => {
        if (chatPanel) return;

        injectChatStyles();
        chatMessages = loadJson(STORAGE_KEYS.chat, []);

        chatPanel = document.createElement("section");
        chatPanel.className = "chat-panel";
        chatPanel.setAttribute("aria-label", "Direct messages");
        chatPanel.innerHTML = `
            <header class="chat-panel-header">
                <h2 class="chat-panel-title">Chat</h2>
                <div class="chat-panel-controls">
                    <button type="button" class="chat-filter" aria-label="Filter chats">
                        All
                        <span class="material-icons" aria-hidden="true">expand_more</span>
                    </button>
                    <button type="button" class="chat-control-btn" aria-label="Notifications">
                        <span class="material-icons" aria-hidden="true">notifications</span>
                    </button>
                    <button type="button" class="chat-control-btn" aria-label="New chat">
                        <span class="material-icons" aria-hidden="true">add</span>
                    </button>
                    <button type="button" class="chat-control-btn chat-panel-close" aria-label="Close chat">
                        <span class="material-icons" aria-hidden="true">expand_more</span>
                    </button>
                </div>
            </header>
            <div class="chat-search-wrap">
                <label class="chat-search" aria-label="Search chats">
                    <span class="material-icons" aria-hidden="true">search</span>
                    <input type="text" class="chat-search-input" placeholder="Search" />
                </label>
            </div>
            <div class="chat-panel-body"></div>
            <footer class="chat-panel-footer">
                <input class="chat-panel-input" type="text" placeholder="Message someone" aria-label="Message input" />
                <button type="button" class="chat-panel-send">Send</button>
            </footer>
        `;

        chatBody = chatPanel.querySelector(".chat-panel-body");
        chatInput = chatPanel.querySelector(".chat-panel-input");
        const closeButton = chatPanel.querySelector(".chat-panel-close");
        const sendButton = chatPanel.querySelector(".chat-panel-send");

        closeButton?.addEventListener("click", () => {
            chatPanel?.classList.remove("open");
        });

        sendButton?.addEventListener("click", () => {
            if (!chatInput) return;
            const text = chatInput.value;
            if (!text.trim()) return;

            sendChatMessage(text, "mine");
            chatInput.value = "";
            chatInput.focus();

            window.setTimeout(() => {
                sendChatMessage("Thanks for your message. I will get back to you soon.", "bot");
            }, 650);
        });

        chatInput?.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            sendButton?.click();
        });

        document.body.appendChild(chatPanel);
        renderChatMessages();
    };

    const toggleChatPanel = () => {
        buildChatPanel();
        if (!chatPanel) return;

        if (grokPanel) {
            grokPanel.classList.remove("open");
        }

        const isOpen = chatPanel.classList.toggle("open");
        if (isOpen) {
            chatInput?.focus();
            renderChatMessages();
        }
    };

    const buildGrokPanel = () => {
        if (grokPanel) return;

        injectGrokStyles();

        grokPanel = document.createElement("section");
        grokPanel.className = "grok-panel";
        grokPanel.setAttribute("aria-label", "Grok assistant");
        grokPanel.innerHTML = `
            <header class="grok-panel-header">
                <button type="button" class="grok-icon-btn" aria-label="Recent prompts">
                    <span class="material-icons" aria-hidden="true">history</span>
                </button>
                <button type="button" class="grok-icon-btn" aria-label="Expand">
                    <span class="material-icons" aria-hidden="true">open_in_full</span>
                </button>
                <button type="button" class="grok-icon-btn grok-close" aria-label="Close Grok">
                    <span class="material-icons" aria-hidden="true">expand_more</span>
                </button>
            </header>
            <h2 class="grok-title">How can I help you today?</h2>
            <section class="grok-composer" aria-label="Ask Grok">
                <input class="grok-input" type="text" placeholder="What would you like to create today?" />
                <div class="grok-composer-row">
                    <div class="grok-left-tools">
                        <span class="material-icons" aria-hidden="true">attach_file</span>
                        <span class="grok-mode">Auto <span class="material-icons" aria-hidden="true">expand_more</span></span>
                    </div>
                    <button type="button" class="grok-send" aria-label="Send to Grok">
                        <span class="material-icons" aria-hidden="true">graphic_eq</span>
                    </button>
                </div>
            </section>
            <div class="grok-actions">
                <button type="button" class="grok-chip"><span class="material-icons" aria-hidden="true">photo_library</span>Create Images</button>
                <button type="button" class="grok-chip"><span class="material-icons" aria-hidden="true">edit</span>Edit Image</button>
                <button type="button" class="grok-chip"><span class="material-icons" aria-hidden="true">newspaper</span>Latest News</button>
            </div>
        `;

        const closeButton = grokPanel.querySelector(".grok-close");
        grokInput = grokPanel.querySelector(".grok-input");
        const sendButton = grokPanel.querySelector(".grok-send");

        closeButton?.addEventListener("click", () => {
            grokPanel?.classList.remove("open");
        });

        sendButton?.addEventListener("click", () => {
            if (!grokInput) return;
            const text = grokInput.value.trim();
            if (!text) return;
            sendButton.setAttribute("aria-label", "Prompt sent");
            grokInput.value = "";
            grokInput.focus();
        });

        grokInput?.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            sendButton?.click();
        });

        document.body.appendChild(grokPanel);
    };

    const toggleGrokPanel = () => {
        buildGrokPanel();
        if (!grokPanel) return;

        if (chatPanel) {
            chatPanel.classList.remove("open");
        }

        const isOpen = grokPanel.classList.toggle("open");
        if (isOpen) {
            grokInput?.focus();
        }
    };

    const closeAllTweetMenus = () => {
        document.querySelectorAll(".tweet-more-menu").forEach((menu) => menu.remove());
    };

    const buildTweetMenu = () => {
        const menu = document.createElement("div");
        menu.className = "tweet-more-menu";
        menu.innerHTML = `
            <button type="button" class="delete" data-action="delete-tweet" aria-label="Delete tweet">
                <span class="material-icons" aria-hidden="true">delete_outline</span>
                <span>Delete post</span>
            </button>
        `;
        return menu;
    };

    const toggleTweetMenu = (moreButton) => {
        const tweetMore = moreButton.closest(".tweet-more");
        if (!tweetMore) return;

        const existingMenu = tweetMore.querySelector(".tweet-more-menu");
        closeAllTweetMenus();
        if (existingMenu) return;

        const menu = buildTweetMenu();
        tweetMore.appendChild(menu);
    };

    const deleteTweet = (tweetElement) => {
        if (!feed || !tweetElement) return;
        tweetElement.remove();
        persistLikedTweets();
    };

    const persistLikedTweets = () => {
        if (!feed) return;
        const likedTweetIds = [...feed.querySelectorAll(".tweet")]
            .filter((tweet) => {
                const likeButton = tweet.querySelector('.action-btn[aria-label="Like"]');
                return likeButton?.classList.contains("liked");
            })
            .map((tweet) => tweet.dataset.tweetId)
            .filter(Boolean);

        saveJson(STORAGE_KEYS.likes, likedTweetIds);
    };

    const handleThemeToggle = () => {
        const currentTheme = html.getAttribute("data-theme") === THEME.dark ? THEME.dark : THEME.light;
        setTheme(currentTheme === THEME.dark ? THEME.light : THEME.dark);
    };

    const handleLikeClick = (event) => {
        const clickedButton = event.target.closest('.action-btn[aria-label="Like"]');
        if (!clickedButton || !feed?.contains(clickedButton)) return;

        const willBeLiked = !clickedButton.classList.contains("liked");
        setLikeUI(clickedButton, willBeLiked);
        applyLikeCount(clickedButton, willBeLiked);
        persistLikedTweets();
    };

    const handleTweetMenuClick = (event) => {
        const moreButton = event.target.closest('.tweet .tweet-more .ghost-icon[aria-label="More"]');
        if (moreButton && feed?.contains(moreButton)) {
            event.preventDefault();
            event.stopPropagation();
            toggleTweetMenu(moreButton);
            return;
        }

        const deleteButton = event.target.closest('[data-action="delete-tweet"]');
        if (deleteButton && feed?.contains(deleteButton)) {
            event.preventDefault();
            const tweet = deleteButton.closest(".tweet");
            closeAllTweetMenus();
            deleteTweet(tweet);
        }
    };

    const init = () => {
        initializeTheme();
        initializeTweets();
        updatePostButtonState();
        injectTweetMenuStyles();

        if (themeToggleButton) {
            themeToggleButton.addEventListener("click", handleThemeToggle);
        }

        if (feed) {
            feed.addEventListener("click", handleLikeClick);
            feed.addEventListener("click", handleTweetMenuClick);
        }

        document.addEventListener("click", (event) => {
            if (event.target.closest(".tweet-more")) return;
            closeAllTweetMenus();
        });

        document.addEventListener("click", (event) => {
            if (!grokPanel || !grokPanel.classList.contains("open")) return;
            const clickedInsidePanel = event.target.closest(".grok-panel");
            const clickedGrokButton = event.target.closest("#support-buttons .grok");
            if (!clickedInsidePanel && !clickedGrokButton) {
                grokPanel.classList.remove("open");
            }
        });

        if (postButton) {
            postButton.addEventListener("click", submitComposerPost);
        }

        if (tweetTextInput) {
            tweetTextInput.addEventListener("input", updatePostButtonState);
            tweetTextInput.addEventListener("keydown", (event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    submitComposerPost();
                }
            });
        }

        if (composeNavButton && tweetTextInput) {
            composeNavButton.addEventListener("click", () => {
                tweetTextInput.focus();
                tweetTextInput.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        }

        if (floatingChatButton) {
            floatingChatButton.addEventListener("click", toggleChatPanel);
        }

        if (floatingGrokButton) {
            floatingGrokButton.addEventListener("click", (event) => {
                event.preventDefault();
                toggleGrokPanel();
            });
        }

    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
