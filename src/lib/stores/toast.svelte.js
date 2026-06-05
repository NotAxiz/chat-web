export const toastState = $state({
  message: '',
  visible: false,
  type: 'success'
});

export function showToast(msg, type = 'success') {
  toastState.message = msg;
  toastState.type = type;
  toastState.visible = true;
  setTimeout(() => {
    toastState.visible = false;
  }, 3000);
}
