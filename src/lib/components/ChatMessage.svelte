<script>
  import { marked } from 'marked';
  import hljs from 'highlight.js';
  import 'highlight.js/styles/github-dark.css';
  
  let { role = 'user', content = '' } = $props();
  let isUser = $derived(role === 'user');
  let copied = $state(false);

  function copyMessage() {
    navigator.clipboard.writeText(content).then(() => {
      copied = true;
      if (window.showToast) window.showToast('Copied to clipboard', 'success');
      setTimeout(() => copied = false, 2000);
    });
  }

  const renderer = new marked.Renderer();

  renderer.code = function({ text, lang }) {
    const code = typeof text === 'string' ? text : arguments[0];
    const language = typeof lang === 'string' ? lang : arguments[1];
    const validLang = (language && hljs.getLanguage(language)) ? language : 'plaintext';
    
    let highlighted = code;
    try { highlighted = hljs.highlight(code, { language: validLang }).value; } catch(e) {}
    
    const safeCode = encodeURIComponent(code).replace(/'/g, '%27');

    const langIcons = {
      javascript: '#F7DF1E', js: '#F7DF1E', jsx: '#F7DF1E', typescript: '#3178C6', ts: '#3178C6',
      python: '#3776AB', py: '#3776AB', html: '#E34F26', xml: '#E34F26',
      css: '#1572B6', bash: '#89E051', sh: '#89E051', json: '#8BC34A',
      rust: '#CE422B', go: '#00ADD8', java: '#ED8B00', cpp: '#00599C', c: '#A8B9CC',
    };

    const color = langIcons[validLang.toLowerCase()] || 'var(--text-tertiary)';
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>`;

    let actions = `<button class="code-action-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${safeCode}')); window.showToast('Copied!', 'success'); this.querySelector('span').textContent='Copied'; setTimeout(()=>this.querySelector('span').textContent='Copy',1500)">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      <span>Copy</span>
    </button>`;

    if (['html', 'xml'].includes(validLang)) {
      actions += `<button class="code-action-btn run-btn" onclick="const w=window.open('','_blank');w.document.write(decodeURIComponent('${safeCode}'));w.document.close();window.showToast('Running in new tab','info')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Run</span>
      </button>`;
    }

    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <div class="code-language-tag">${dot}<span class="code-language">${validLang}</span></div>
        <div class="code-actions">${actions}</div>
      </div>
      <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
    </div>`;
  };

  marked.setOptions({ renderer });
  let parsedContent = $derived(isUser ? content : marked.parse(content));
</script>

<div class="msg-row {isUser ? 'user-row' : 'ai-row'}">
  {#if !isUser}
    <div class="ai-mark">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
        <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </div>
  {/if}

  <div class="msg-body">
    {#if isUser}
      <div class="user-bubble">{content}</div>
    {:else}
      {#if content === ''}
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      {:else}
        <div class="prose">{@html parsedContent}</div>
        <div class="action-bar">
          <button class="action-btn" onclick={copyMessage} title="Copy response">
            {#if copied}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {:else}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            {/if}
          </button>
          <button class="action-btn" title="Good response">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          </button>
          <button class="action-btn" title="Bad response">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .msg-row {
    display: flex;
    width: 100%;
    gap: 14px;
    padding: 6px 0;
    animation: fadeUp 0.3s var(--ease, cubic-bezier(0.16,1,0.3,1)) both;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .ai-row { align-items: flex-start; }
  .user-row { justify-content: flex-end; padding-left: 4rem; }

  .user-row .msg-body {
    display: flex;
    justify-content: flex-end;
  }

  /* AI Icon */
  .ai-mark {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* Message body */
  .msg-body {
    flex: 1;
    min-width: 0;
    max-width: 100%;
  }

  /* User bubble — clean, minimal pill */
  .user-bubble {
    display: inline-block;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 10px 16px;
    border-radius: 18px;
    border-bottom-right-radius: 4px;
    font-size: 0.9375rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    max-width: 100%;
  }

  /* Action bar below AI response */
  .action-bar {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-top: 10px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .msg-row:hover .action-bar,
  .ai-row:focus-within .action-bar {
    opacity: 1;
  }

  .action-btn {
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--r-xs);
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .action-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* 3-dot typing */
  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 14px 0 10px;
  }
  .typing-indicator span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-tertiary);
    animation: dotBounce 1.3s ease-in-out infinite both;
  }
  .typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
  .typing-indicator span:nth-child(3) { animation-delay: 0.30s; }

  @keyframes dotBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
</style>
