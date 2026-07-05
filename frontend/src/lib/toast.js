import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

export const toastSuccess = (title) => Toast.fire({ icon: "success", title });
export const toastError = (title) => Toast.fire({ icon: "error", title });

export const confirmAction = (options) =>
  Swal.fire({
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#dc2626",
    ...options,
  });
