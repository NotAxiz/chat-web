<div class="typing-indicator glass-panel">
  <span></span>
  <span></span>
  <span></span>
</div>

<style>
  .typing-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
    border-radius: var(--radius-lg);
    border-bottom-left-radius: 4px;
    width: fit-content;
    margin-bottom: 1rem;
  }
  
  .typing-indicator span {
    width: 6px;
    height: 6px;
    background-color: var(--accent-primary);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }
  
  .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); background-color: var(--accent-secondary); }
  }
</style>
