function showAlertSuccess(title, message) {
    Swal.fire({
        title: `<span class="fw-bold">${title}</span>`,
        html: `<div class="text-muted" style="font-size:0.95rem">${message}</div>`,
        icon: 'success',
        iconColor: '#198754',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#198754',
        customClass: {
            popup: 'rounded-4 shadow-lg border-0',
            confirmButton: 'btn btn-success btn-lg fw-bold px-4 rounded-pill'
        },
        buttonsStyling: false
    });
}

function showAlertError(title, message) {
    Swal.fire({
        title: `<span class="fw-bold">${title}</span>`,
        html: `<div class="text-muted" style="font-size:0.95rem">${message}</div>`,
        icon: 'error',
        iconColor: '#dc3545',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0d6efd',
        customClass: {
            popup: 'rounded-4 shadow-lg border-0',
            confirmButton: 'btn btn-primary btn-lg fw-bold px-4 rounded-pill'
        },
        buttonsStyling: false
    });
}

function showAlertInfo(title, message) {
    Swal.fire({
        title: `<span class="fw-bold">${title}</span>`,
        html: `<div class="text-muted" style="font-size:0.95rem">${message}</div>`,
        icon: 'info',
        iconColor: '#0d6efd',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0d6efd',
        customClass: {
            popup: 'rounded-4 shadow-lg border-0',
            confirmButton: 'btn btn-primary btn-lg fw-bold px-4 rounded-pill'
        },
        buttonsStyling: false
    });
}

async function showAlertConfirm(title, message, confirmText, confirmColor) {
    const result = await Swal.fire({
        title: `<span class="fw-bold">${title}</span>`,
        html: `<div class="text-muted" style="font-size:0.95rem">${message}</div>`,
        icon: 'warning',
        iconColor: '#ffc107',
        showCancelButton: true,
        confirmButtonColor: confirmColor || '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: confirmText || 'Sí, confirmar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true,
        customClass: {
            popup: 'rounded-4 shadow-lg border-0',
            confirmButton: 'btn btn-lg fw-bold px-4 rounded-pill',
            cancelButton: 'btn btn-secondary btn-lg fw-bold px-4 rounded-pill'
        },
        buttonsStyling: false
    });
    return result.isConfirmed;
}

function showAlertToast(icon, message) {
    Swal.fire({
        title: message,
        icon: icon,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
        customClass: {
            popup: 'rounded-4 shadow-lg border-0 mt-5'
        }
    });
}
