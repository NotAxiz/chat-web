<script>
  import { toastState } from '$lib/stores/toast.svelte.js';
</script>

{#if toastState.visible}
  <div class="toast {toastState.type}" role="status">
    <div class="toast-icon">
      {#if toastState.type === 'success'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      {:else if toastState.type === 'error'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {/if}
    </div>
    <span class="toast-msg">{toastState.message}</span>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: #e8e8e8;
    color: #111;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35);
    z-index: 9999;
    animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  
  .toast.error {
    background: #1a1a1a;
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.25);
  }
  
  .toast.info {
    background: #1a1a1a;
    color: #e8e8e8;
    border: 1px solid rgba(255,255,255,0.1);
  }
  
  .toast-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  
  .toast-msg {
    line-height: 1;
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.95); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
</style>
