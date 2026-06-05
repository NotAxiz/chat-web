<script>
  let { show = false, onSave } = $props();
  let name = $state('');

  function handleSave() {
    if (name.trim()) {
      onSave(name.trim());
    }
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === 'Enter') {
      handleSave();
    }
  }
</script>

{#if show}
  <div class="modal-overlay">
    <div class="modal-content glass-panel">
      <div class="modal-header">
        <h2>Welcome to Nexus AI</h2>
      </div>
      
      <div class="modal-body">
        <label for="username">Please enter your name to continue:</label>
        <input 
          type="text" 
          id="username" 
          bind:value={name} 
          onkeydown={handleKeydown}
          placeholder="Your name..." 
          autocomplete="off"
        />
      </div>
      
      <div class="modal-footer">
        <button class="btn-save" onclick={handleSave} disabled={!name.trim()}>
          Start Chatting
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
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    width: 90%;
    max-width: 400px;
    border-radius: var(--radius-lg, 12px);
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    background: var(--bg-app, #1a1a1a);
    border: 1px solid var(--border, #333);
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  .modal-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary, #fff);
    margin: 0;
    text-align: center;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  label {
    font-size: 0.95rem;
    color: var(--text-secondary, #aaa);
    text-align: center;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: var(--radius-md, 8px);
    background: var(--bg-panel, #222);
    border: 1px solid var(--border, #333);
    color: var(--text-primary, #fff);
    font-size: 1.1rem;
    outline: none;
    transition: border-color 0.2s;
    text-align: center;
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--accent-primary, #3b82f6);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .modal-footer {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .btn-save {
    width: 100%;
    padding: 12px 20px;
    border-radius: var(--radius-md, 8px);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    background: var(--accent-primary, #3b82f6);
    color: white;
  }

  .btn-save:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleUp {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
