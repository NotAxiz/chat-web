<script>
  import '../app.css';
  import Toast from '$lib/components/Toast.svelte';
  import { showToast } from '$lib/stores/toast.svelte.js';
  import { onMount } from 'svelte';
  
  onMount(() => {
    window.showToast = showToast;
  });
</script>

<slot />
<Toast />
