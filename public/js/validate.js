// Validation Bootstrap + pré-remplissage par téléphone + lien historique
(function () {
  const form = document.getElementById('orderForm');

  // --- Validation côté client
  if (form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  }

  // --- Helpers
  async function fetchProfileByPhone(phone) {
    if (!phone) return null;
    try {
      const res = await fetch(`/api/customer?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.ok || !data.found) return null;
      return data; // { ok, found, profile, ordersCount }
    } catch {
      return null;
    }
  }

  async function onPhoneChanged() {
    const input = document.getElementById('phone');
    const info = document.getElementById('phoneInfo');
    const link = document.getElementById('linkHistory');
    if (!input) return;

    const phone = input.value.trim();

    // Met à jour le lien "Voir l'historique"
    if (link) {
      link.href = `/historique?phone=${encodeURIComponent(phone)}`;
      link.addEventListener('click', (ev) => {
        if (!phone) ev.preventDefault();
      });
    }

    if (!phone) {
      if (info) info.textContent = '';
      return;
    }

    const data = await fetchProfileByPhone(phone);
    if (data && data.profile) {
      // Pré-remplir les champs s'ils sont vides pour ne pas écraser ce que l'utilisateur tape
      const toFill = ['firstname', 'lastname', 'address', 'postal', 'email'];
      toFill.forEach((id) => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = data.profile[id] || '';
      });
      if (info) {
        const n = data.ordersCount || 0;
        info.textContent = `Profil chargé (${n} commande${n > 1 ? 's' : ''}).`;
      }
    } else {
      if (info) info.textContent = 'Aucun historique pour ce numéro.';
    }
  }

  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('change', onPhoneChanged);
    phoneInput.addEventListener('blur', onPhoneChanged);
    // Appel initial si un numéro est déjà présent (retour de validation)
    if (phoneInput.value) onPhoneChanged();
  }
})();
