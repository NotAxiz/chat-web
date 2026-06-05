<script>
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import UserModal from '$lib/components/UserModal.svelte';
  import { onMount } from 'svelte';
  
  /** @type {any[]} */
  let messages = $state([]);
  let inputMessage = $state('');
  let isTyping = $state(false);
  let chatContainer = $state();
  let textareaElement = $state();
  let currentChatId = $state(null);
  /** @type {any[]} */
  let historyList = $state([]);
  let sidebarOpen = $state(true);
  /** @type {AbortController | null} */
  let abortController = null;
  let showScrollBtn = $state(false);
  let searchQuery = $state('');
  let showSettings = $state(false);
  let username = $state('');
  let showUserModal = $state(false);

  const WELCOME_MSG = 'Hello. How can I help you today?';

  let filteredHistory = $derived(
    searchQuery.trim()
      ? historyList.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : historyList
  );

  let isWelcome = $derived(
    messages.length === 1 && messages[0].role === 'assistant' && messages[0].content === WELCOME_MSG
  );

  onMount(async () => {
    const stored = localStorage.getItem('chatUsername');
    if (stored) {
      username = stored;
      await fetchHistory();
      if (messages.length === 0) {
        messages = [{ role: 'assistant', content: WELCOME_MSG }];
      }
    } else {
      showUserModal = true;
    }
    if (window.innerWidth < 768) sidebarOpen = false;
  });

  /** @param {string} name */
  function saveUsername(name) {
    username = name;
    localStorage.setItem('chatUsername', username);
    showUserModal = false;
    fetchHistory();
    if (messages.length === 0) {
      messages = [{ role: 'assistant', content: WELCOME_MSG }];
    }
  }

  async function fetchHistory() {
    if (!username) return;
    try {
      const res = await fetch('/api/history', { headers: { 'x-username': username } });
      if (res.ok) historyList = await res.json();
    } catch (e) {}
  }

  /** @param {string} id */
  async function loadChat(id) {
    if (!username) return;
    try {
      const res = await fetch(`/api/history/${id}`, { headers: { 'x-username': username } });
      if (res.ok) {
        const data = await res.json();
        messages = data.messages;
        currentChatId = data.id;
        if (window.innerWidth < 768) sidebarOpen = false;
        scrollToBottom();
      }
    } catch (e) {}
  }

  function scrollToBottom() {
    setTimeout(() => { if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight; }, 50);
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function startNewChat() {
    messages = [{ role: 'assistant', content: WELCOME_MSG }];
    inputMessage = '';
    currentChatId = null;
    if (window.innerWidth < 768) sidebarOpen = false;
    if (textareaElement) { textareaElement.style.height = 'auto'; textareaElement.focus(); }
  }

  function toggleSidebar() { sidebarOpen = !sidebarOpen; }

  /**
   * @param {string} id
   * @param {MouseEvent} [e]
   */
  async function deleteChat(id, e) {
    e?.stopPropagation();
    if (!username) return;
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE', headers: { 'x-username': username } });
      if (res.ok) {
        if (currentChatId === id) startNewChat();
        await fetchHistory();
        /** @type {any} */ (window).showToast?.('Chat deleted', 'success');
      }
    } catch (e) {}
  }

  function exportChat() {
    if (isWelcome) return;
    let md = `# Chat — ${new Date().toLocaleDateString()}\n\n`;
    for (const m of messages) {
      if (m.role === 'assistant' && !m.content) continue;
      md += `**${m.role === 'user' ? 'You' : 'AI'}**\n\n${m.content}\n\n---\n\n`;
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })),
      download: `chat-${Date.now()}.md`
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    /** @type {any} */ (window).showToast?.('Chat exported as Markdown', 'success');
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  /** @param {Event} e */
  function handleInput(e) {
    const el = /** @type {HTMLTextAreaElement} */ (e.target);
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  async function sendMessage() {
    if (!inputMessage.trim() || isTyping) return;
    const userMsg = inputMessage.trim();
    messages = [...messages, { role: 'user', content: userMsg }];
    inputMessage = '';
    isTyping = true;
    if (textareaElement) textareaElement.style.height = 'auto';
    scrollToBottom();
    messages = [...messages, { role: 'assistant', content: '' }];
    abortController = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-username': username 
        },
        body: JSON.stringify({ messages: messages.slice(0, -1), chatId: currentChatId }),
        signal: abortController.signal
      });
      if (!response.ok) throw new Error('API error');

      if (!response.body) throw new Error('Response body is null');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.type === 'id' && !currentChatId) currentChatId = data.chatId;
          else if (data.type === 'text') { messages[messages.length - 1].content += data.text; scrollToBottom(); }
          else if (data.type === 'error') messages[messages.length - 1].content += `\n**Error:** ${data.error}`;
        }
      }
      fetchHistory();
    } catch (err) {
      const e = /** @type {Error} */ (err);
      if (e.name === 'AbortError') {
        messages[messages.length - 1].content += '\n\n*Generation stopped.*';
      } else {
        messages[messages.length - 1].content += `\n**Error:** ${e.message}`;
      }
    } finally {
      isTyping = false;
      abortController = null;
      scrollToBottom();
    }
  }

  function stopGenerating() {
    abortController?.abort();
    isTyping = false;
    /** @type {any} */ (window).showToast?.('Generation stopped', 'info');
  }

  function handleScroll() {
    if (!chatContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainer;
    showScrollBtn = scrollHeight - scrollTop - clientHeight > 120;
  }

  function forceScroll() { chatContainer?.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' }); }
</script>

<div class="shell">

  <!-- ── SIDEBAR ── -->
  <div class="sidebar-rail" class:open={sidebarOpen}>
    <nav class="sidebar">
      <div class="sidebar-top">
        <div class="sidebar-brand">
          <div class="brand-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <span class="brand-name">Nexus</span>
        </div>
        <button class="icon-btn" onclick={toggleSidebar} title="Close sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/></svg>
        </button>
      </div>

      <button class="new-chat-btn" onclick={startNewChat}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        New chat
      </button>

      <div class="search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input bind:value={searchQuery} placeholder="Search chats…" class="search-input" />
      </div>

      <div class="history-scroll">
        {#if filteredHistory.length === 0}
          <p class="empty-hint">{searchQuery ? 'No results' : 'No chats yet'}</p>
        {:else}
          <p class="section-label">Recent</p>
          {#each filteredHistory as chat}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
            <div class="hist-item {currentChatId === chat.id ? 'active' : ''}" role="button" tabindex="0" onclick={() => loadChat(chat.id)}>
              <span class="hist-title">{chat.title}</span>
              <button class="hist-del" onclick={(e) => deleteChat(chat.id, e)} title="Delete">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          {/each}
        {/if}
      </div>

      <div class="sidebar-footer">
        <div class="user-row-sb">
          <div class="user-avatar">{username ? username[0].toUpperCase() : 'U'}</div>
          <div class="user-info">
            <p class="user-name">{username || 'User'}</p>
            <p class="user-plan">Free plan</p>
          </div>
          <button class="icon-btn" onclick={(e) => { e.stopPropagation(); showSettings = true; }} title="Settings" style="margin-left: auto;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </div>
    </nav>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  {#if sidebarOpen}
    <div class="overlay" role="presentation" onclick={toggleSidebar}></div>
  {/if}

  <!-- ── MAIN ── -->
  <main class="main">
    <!-- Top Bar -->
    <header class="topbar">
      <div class="topbar-left">
        {#if !sidebarOpen}
          <button class="icon-btn" onclick={toggleSidebar} title="Open sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/></svg>
          </button>
        {/if}
        <div class="model-chip">
          <div class="model-dot"></div>
          Gemini Flash
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="topbar-right">
        <button class="icon-btn" onclick={exportChat} title="Export chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="icon-btn" onclick={startNewChat} title="New chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </header>

    <!-- Chat Viewport -->
    <div class="viewport" bind:this={chatContainer} onscroll={handleScroll}>
      {#if isWelcome}
        <div class="welcome">
          <p class="welcome-greet">{getGreeting()}</p>
          <h1 class="welcome-question">What can I help you with?</h1>
          <div class="chips">
            {#each [
              { icon: '✦', label: 'Write code', prompt: 'Help me write a Python script to automate a task' },
              { icon: '◈', label: 'Explain a concept', prompt: 'Explain how transformers work in AI' },
              { icon: '⊞', label: 'Summarize text', prompt: 'Summarize the key ideas of the book Thinking Fast and Slow' },
              { icon: '⟐', label: 'Debug an error', prompt: 'I have a bug in my code, help me debug it' },
            ] as c}
              <button class="chip" onclick={() => { inputMessage = c.prompt; sendMessage(); }}>
                <span class="chip-icon">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <div class="thread">
          {#each messages as msg}
            <ChatMessage role={msg.role} content={msg.content} />
          {/each}
        </div>
      {/if}
      <div class="spacer"></div>
    </div>

    <!-- Scroll to bottom pill -->
    {#if showScrollBtn}
      <button class="scroll-pill" onclick={forceScroll}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
        Scroll to bottom
      </button>
    {/if}

    <!-- Input Footer -->
    <footer class="input-area">
      <div class="input-wrap">
        <div class="input-box">
          <textarea
            bind:this={textareaElement}
            bind:value={inputMessage}
            onkeydown={handleKeydown}
            oninput={handleInput}
            placeholder="Ask anything…"
            rows="1"
          ></textarea>
          <div class="input-actions">
              {#if isTyping}
                <button class="send-btn stop" onclick={stopGenerating} title="Stop generation">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                </button>
              {:else}
                <button class="send-btn {inputMessage.trim() ? 'active' : ''}" onclick={sendMessage} disabled={!inputMessage.trim()} title="Send message">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              {/if}
            </div>
        </div>
        <p class="disclaimer">AI can make mistakes. Verify important information.</p>
      </div>
    </footer>
  </main>
</div>

<SettingsModal show={showSettings} onClose={() => showSettings = false} {username} />
<UserModal show={showUserModal} onSave={saveUsername} />

<style>
  /* ── Shell Layout ── */
  .shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--bg-app);
  }

  /* ── Sidebar ── */
  .sidebar-rail {
    width: 256px;
    height: 100vh;
    flex-shrink: 0;
    background: var(--bg-sidebar);
    border-right: 1px solid var(--border);
    transition: width 0.25s var(--ease), margin-left 0.25s var(--ease);
    z-index: 100;
    overflow: hidden;
  }
  .sidebar-rail:not(.open) {
    width: 0;
    border-right-color: transparent;
  }

  .sidebar {
    width: 256px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px 12px;
    flex-shrink: 0;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .brand-mark {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: var(--bg-active);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .brand-name {
    font-weight: 600;
    font-size: 0.9375rem;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .new-chat-btn {
    display: flex;
    align-items: center;
    gap: 9px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: var(--r-sm);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    width: calc(100% - 24px);
    margin: 0 12px 8px;
  }
  .new-chat-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-focus);
  }

  /* Search */
  .search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 12px 10px;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 7px 10px;
    color: var(--text-tertiary);
  }
  .search-input {
    background: transparent;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 0.8125rem;
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
  }
  .search-input::placeholder { color: var(--text-tertiary); }

  /* History */
  .history-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
  }

  .section-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-tertiary);
    padding: 0 6px;
    margin-bottom: 4px;
  }

  .empty-hint {
    font-size: 0.8125rem;
    color: var(--text-tertiary);
    text-align: center;
    padding: 1.5rem 0;
  }

  .hist-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 7px 10px;
    border-radius: var(--r-sm);
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    transition: background 0.15s, color 0.15s;
    margin-bottom: 1px;
  }
  .hist-item:hover { background: var(--bg-hover); color: var(--text-primary); }
  .hist-item.active { background: var(--bg-active); color: var(--text-primary); }
  .hist-title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .hist-del {
    display: none;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: 4px;
    padding: 3px;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }
  .hist-item:hover .hist-del { display: flex; }
  .hist-del:hover { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

  /* Sidebar Footer */
  .sidebar-footer {
    padding: 12px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .user-row-sb {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: background 0.15s;
  }
  .user-row-sb:hover { background: var(--bg-hover); }
  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--bg-active);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .user-name {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.2;
  }
  .user-plan {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    line-height: 1.2;
  }

  /* Mobile overlay */
  .overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 90;
  }
  @media (max-width: 768px) {
    .sidebar-rail { position: fixed; }
    .overlay { display: block; }
  }

  /* ── Main ── */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-width: 0;
    position: relative;
  }

  /* Top Bar */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 54px;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-app);
    flex-shrink: 0;
    z-index: 10;
  }
  .topbar-left, .topbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .model-chip {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    padding: 5px 10px;
    border-radius: var(--r-sm);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    background: var(--bg-panel);
  }
  .model-chip:hover { background: var(--bg-hover); border-color: var(--border-focus); }
  .model-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    flex-shrink: 0;
  }
  .icon-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    border-radius: var(--r-sm);
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* Viewport */
  .viewport {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .thread {
    width: 100%;
    max-width: 720px;
    padding: 2rem 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .spacer { height: 180px; flex-shrink: 0; }

  /* Welcome */
  .welcome {
    width: 100%;
    max-width: 720px;
    margin: auto;
    padding: 4rem 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    animation: fadeUp 0.4s var(--ease, ease) both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .welcome-greet {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    font-weight: 400;
    margin-bottom: 8px;
    letter-spacing: 0.01em;
  }
  .welcome-question {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.25;
    letter-spacing: -0.03em;
    margin-bottom: 2.25rem;
  }
  .chips {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 100%;
  }
  .chip {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 13px 16px;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
  }
  .chip:hover {
    background: var(--bg-hover);
    border-color: var(--border-focus);
    color: var(--text-primary);
    transform: translateY(-1px);
  }
  .chip-icon {
    font-size: 0.9rem;
    color: var(--text-tertiary);
    flex-shrink: 0;
    font-style: normal;
  }

  /* Scroll to bottom */
  .scroll-pill {
    position: absolute;
    bottom: 140px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-focus);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    font-family: inherit;
    padding: 6px 14px;
    border-radius: 999px;
    cursor: pointer;
    z-index: 20;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .scroll-pill:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* Input */
  .input-area {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    padding: 0 1.5rem 1.5rem;
    background: linear-gradient(to bottom, transparent, var(--bg-app) 30%);
    pointer-events: none;
  }
  .input-wrap {
    width: 100%;
    max-width: 720px;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .input-box {
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    padding: 14px 12px 14px 20px;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-box:focus-within {
    border-color: rgba(255,255,255,0.18);
    box-shadow: 0 0 0 3px rgba(255,255,255,0.04);
  }
  .input-box textarea {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-family: inherit;
    line-height: 1.6;
    resize: none;
    max-height: 200px;
    padding: 0;
    width: 100%;
  }
  .input-box textarea::placeholder { color: var(--text-tertiary); }

  .input-bottom-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--border);
    padding-top: 10px;
  }

  .input-hint {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .input-hint kbd {
    display: inline-flex;
    align-items: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 0.625rem;
    font-family: inherit;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .input-actions { display: flex; align-items: center; gap: 6px; }

  .send-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--bg-active);
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.15s;
    flex-shrink: 0;
  }
  .send-btn.active {
    background: var(--text-primary);
    color: var(--bg-app);
  }
  .send-btn.active:hover { transform: scale(1.06); }
  .send-btn.stop {
    background: var(--bg-elevated);
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  .send-btn.stop:hover { background: var(--bg-hover); color: var(--text-primary); }
  .send-btn:disabled { cursor: not-allowed; opacity: 0.35; }

  .disclaimer {
    font-size: 0.6875rem;
    color: var(--text-tertiary);
    text-align: center;
    line-height: 1.4;
  }
</style>
