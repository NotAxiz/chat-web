<script>
  import { onMount } from "svelte";
  let { show = false, onClose, username = "" } = $props();

  let settings = $state({
    apiKey: "",
    theme: "system",
    model: "gemini-1.5-flash",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    topK: 40,
    systemPrompt: "You are a helpful AI assistant.",
  });

  let isSaving = $state(false);
  let statusMessage = $state("");
  let statusType = $state("");

  onMount(async () => {
    if (!username) return;
    try {
      const res = await fetch("/api/settings", {
        headers: { "x-username": username },
      });
      if (res.ok) {
        const data = await res.json();
        if (Object.keys(data).length > 0) {
          settings = { ...settings, ...data };
        }
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  });

  async function saveSettings() {
    isSaving = true;
    statusMessage = "Saving...";

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-username": username,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      statusMessage = "Settings saved successfully!";
      statusType = "success";
      setTimeout(() => {
        onClose();
        statusMessage = "";
      }, 2000);
    } catch (error) {
      statusMessage = "Error: Failed to save settings.";
      statusType = "error";
    } finally {
      isSaving = false;
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-overlay" role="presentation" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal-content glass-panel" role="dialog" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="close-btn" onclick={onClose}>&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="api-key">Gemini API Key</label>
          <input 
            type="password" 
            id="api-key" 
            bind:value={settings.apiKey} 
            placeholder="AIzaSy... or AQ..." 
          />
          <p class="help-text">Your key is stored securely in settings.json.</p>
        </div>

        <div class="form-group row">
          <div class="form-col">
            <label for="theme">Theme</label>
            <select id="theme" bind:value={settings.theme}>
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div class="form-col">
            <label for="model">Model</label>
            <select id="model" bind:value={settings.model}>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
            </select>
          </div>
        </div>

        <div class="form-group row">
          <div class="form-col">
            <label for="temperature">Temperature: {settings.temperature}</label>
            <input
              type="range"
              id="temperature"
              bind:value={settings.temperature}
              min="0"
              max="2"
              step="0.1"
            />
          </div>
          <div class="form-col">
            <label for="maxTokens">Max Tokens</label>
            <input
              type="number"
              id="maxTokens"
              bind:value={settings.maxTokens}
              min="1"
              max="8192"
            />
          </div>
        </div>

        <div class="form-group row">
          <div class="form-col">
            <label for="topP">Top P: {settings.topP}</label>
            <input
              type="range"
              id="topP"
              bind:value={settings.topP}
              min="0"
              max="1"
              step="0.05"
            />
          </div>
          <div class="form-col">
            <label for="topK">Top K</label>
            <input
              type="number"
              id="topK"
              bind:value={settings.topK}
              min="1"
              max="100"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="sys-prompt">System Prompt</label>
          <textarea
            id="sys-prompt"
            bind:value={settings.systemPrompt}
            rows="3"
            placeholder="You are a helpful assistant..."
          ></textarea>
        </div>

        {#if statusMessage}
          <div class="status {statusType}">{statusMessage}</div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" onclick={onClose}>Cancel</button>
        <button class="btn-save" onclick={saveSettings} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    border-radius: var(--radius-lg, 12px);
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    background: var(--bg-app, #1a1a1a);
    border: 1px solid var(--border, #333);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #fff);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-secondary, #aaa);
    font-size: 1.5rem;
    cursor: pointer;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--text-primary, #fff);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group.row {
    flex-direction: row;
    gap: 1rem;
  }

  .form-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.9rem;
    color: var(--text-secondary, #aaa);
  }

  input[type="password"],
  input[type="number"],
  textarea,
  select {
    width: 100%;
    padding: 10px 14px;
    border-radius: var(--radius-md, 8px);
    background: var(--bg-panel, #222);
    border: 1px solid var(--border, #333);
    color: var(--text-primary, #fff);
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
    box-sizing: border-box;
  }

  textarea {
    resize: vertical;
  }

  input[type="password"]:focus,
  input[type="number"]:focus,
  textarea:focus,
  select:focus {
    border-color: var(--accent-primary, #3b82f6);
  }

  input[type="range"] {
    width: 100%;
    margin: 8px 0;
  }

  .help-text {
    font-size: 0.8rem;
    color: var(--text-tertiary, #777);
  }

  .status {
    padding: 10px;
    border-radius: var(--radius-sm, 6px);
    font-size: 0.9rem;
    margin-top: 10px;
  }

  .success {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  button.btn-cancel,
  button.btn-save {
    padding: 10px 20px;
    border-radius: var(--radius-md, 8px);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: transparent;
    color: var(--text-secondary, #aaa);
    border: 1px solid var(--border, #333);
  }

  .btn-cancel:hover {
    background: var(--bg-hover, #333);
    color: var(--text-primary, #fff);
  }

  .btn-save {
    background: var(--accent-primary, #3b82f6);
    color: white;
  }

  .btn-save:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .btn-save:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleUp {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
