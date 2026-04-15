console.log('index.js loaded');
(() => {
  const root = document.documentElement;
  const themeToggleBtn = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const qs = (selector, rootEl = document) => rootEl.querySelector(selector);
  const qsa = (selector, rootEl = document) => Array.from(rootEl.querySelectorAll(selector));

  const setTheme = (theme) => {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    }

    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
    }
  };

  const applyTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setTheme('dark');
    } else if (savedTheme === 'light') {
      setTheme('light');
    } else if (darkModeQuery.matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  const toggleTheme = () => {
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    console.log('theme toggle clicked, new theme:', nextTheme);
  };

  const handleOsChange = () => {
    if (!localStorage.getItem('theme')) {
      applyTheme();
    }
  };

  if (darkModeQuery.addEventListener) {
    darkModeQuery.addEventListener('change', handleOsChange);
  } else if (darkModeQuery.addListener) {
    darkModeQuery.addListener(handleOsChange);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
      themeToggleBtn.blur();
    });
  } else {
    console.warn('themeToggle button not found');
  }

  const feed = qs('#feed');
  const tweetText = qs('#tweetText');
  const postBtn = qs('#postBtn');
  const tabs = qsa('.feed-tab');
  const showPostsBtn = qs('.show-posts');

  const escapeText = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const createTweetHtml = (tweet) => {
    const verifiedHtml = tweet.verified
      ? '<span class="verified material-icons" aria-label="Verified">verified</span>'
      : '';
    return `
      <article class="tweet" data-id="${tweet.id}" data-tab="${tweet.tab}">
        <div class="row">
          <div class="avatar-img-1" aria-hidden="true" style="width:44px;height:44px;"></div>
          <div class="content">
            <div class="tweet-head">
              <div class="tweet-who">
                <span class="name">${escapeText(tweet.authorName)}</span>
                ${verifiedHtml}
                <span class="handle">${escapeText(tweet.authorHandle)}</span>
                <span class="dot">·</span>
                <span class="time">${tweet.time}</span>
              </div>
              <div class="tweet-more" aria-label="Tweet actions">
                <button class="ghost-icon" type="button" aria-label="Delete">
                  <span class="material-icons" aria-hidden="true">delete_outline</span>
                </button>
              </div>
            </div>
            <p>${escapeText(tweet.text).replace(/\n/g, '<br>')}</p>
            <div class="tweet-actions" aria-label="Post actions">
              <button class="action-btn" type="button" aria-label="Reply">
                <span class="material-icons" aria-hidden="true">chat_bubble_outline</span>
                <span class="count">${tweet.counts.reply}</span>
              </button>
              <button class="action-btn" type="button" aria-label="Repost">
                <span class="material-icons" aria-hidden="true">repeat</span>
                <span class="count">${tweet.counts.repost}</span>
              </button>
              <button class="action-btn" type="button" aria-label="Like">
                <span class="material-icons" aria-hidden="true">favorite_border</span>
                <span class="count">${tweet.counts.like}</span>
              </button>
              <button class="action-btn" type="button" aria-label="Views">
                <span class="material-icons" aria-hidden="true">bar_chart</span>
                <span class="count">${tweet.counts.views}</span>
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
      </article>
    `;
  };

  const getActiveTab = () => {
    const activeButton = tabs.find((button) => button.classList.contains('active'));
    if (!activeButton) return 'for-you';
    return activeButton.textContent.toLowerCase().includes('following') ? 'following' : 'for-you';
  };

  const filterFeed = () => {
    if (!feed) return;
    const activeTab = getActiveTab();
    qsa('article.tweet', feed).forEach((tweet) => {
      const tweetTab = tweet.getAttribute('data-tab') || 'for-you';
      tweet.style.display = activeTab === tweetTab ? '' : 'none';
    });
  };

  const normalizeExistingTweets = () => {
    if (!feed) return;
    qsa('article.tweet', feed).forEach((tweet) => {
      if (!tweet.hasAttribute('data-tab')) {
        tweet.setAttribute('data-tab', 'for-you');
      }
      if (!tweet.hasAttribute('data-id')) {
        tweet.setAttribute('data-id', `tweet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      }
    });
  };

  const addNewTweet = (text) => {
    if (!feed) return;
    const tweet = {
      id: `tweet-${Date.now()}`,
      authorName: 'Khumo Mpshe',
      authorHandle: '@khumompshe969704080408',
      verified: false,
      text,
      time: 'now',
      tab: getActiveTab(),
      counts: { reply: 0, repost: 0, like: 0, views: 1 },
    };
    feed.insertAdjacentHTML('afterbegin', createTweetHtml(tweet));
    filterFeed();
  };

  const initTabs = () => {
    tabs.forEach((button) => {
      button.addEventListener('click', () => {
        filterFeed();
      });
    });
  };

  const initComposer = () => {
    if (!postBtn || !tweetText) return;
    const submitTweet = () => {
      const text = tweetText.value.trim();
      if (!text) return;
      addNewTweet(text);
      tweetText.value = '';
    };
    postBtn.addEventListener('click', submitTweet);
    tweetText.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        submitTweet();
      }
    });
  };

  const initFeedActions = () => {
    if (!feed) return;
    feed.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.getAttribute('aria-label') === 'Delete') {
        const tweet = button.closest('.tweet');
        if (tweet) tweet.remove();
        return;
      }
      const actionBtn = button.closest('.action-btn');
      if (!actionBtn) return;
      const countEl = actionBtn.querySelector('.count');
      if (!countEl) return;
      const current = Number(countEl.textContent.replace(/[^0-9]/g, '')) || 0;
      countEl.textContent = current + 1;
    });
  };

  const initShowPostsButton = () => {
    if (!showPostsBtn) return;
    showPostsBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const boot = () => {
    applyTheme();
    if (!feed) return;
    normalizeExistingTweets();
    initTabs();
    initComposer();
    initFeedActions();
    initShowPostsButton();
    filterFeed();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
