/**
 * ---------------------------------------------------------
 * Nom du fichier : validate.js
 * Projet         : Pizzeria (Lab 4)
 * Description    : Scripts front-end pour validation
 *                  des formulaires (Bootstrap-like).
 * Auteur         : Sami Abdelkhalek
 * ---------------------------------------------------------
 */


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
// Validation Bootstrap + messages FR + message de groupe (pizza) + préremplissage téléphone (si déjà en place)
(function () {
  const form = document.getElementById('orderForm');

  // --- Active Bootstrap client-side validation
  if (form) {
    form.addEventListener('submit', function (e) {
      // Handle radio group "pizza" → message groupé
      const radios = form.querySelectorAll('input[name="pizza"]');
      const pizzaInvalid = document.getElementById('pizzaInvalid');
      const anyChecked = Array.from(radios).some(r => r.checked);

      if (!anyChecked) {
        // on “force” une invalidité sur le 1er pour que checkValidity() échoue
        if (radios[0]) radios[0].setCustomValidity('Choisir une sorte de pizza.');
        if (pizzaInvalid) pizzaInvalid.style.display = 'block';
      } else {
        if (radios[0]) radios[0].setCustomValidity('');
        if (pizzaInvalid) pizzaInvalid.style.display = 'none';
      }

      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    });

    // Quand on change de radio → masquer l'erreur groupe
    form.addEventListener('change', (ev) => {
      if (ev.target && ev.target.name === 'pizza') {
        const radios = form.querySelectorAll('input[name="pizza"]');
        const pizzaInvalid = document.getElementById('pizzaInvalid');
        const anyChecked = Array.from(radios).some(r => r.checked);
        if (radios[0]) radios[0].setCustomValidity(anyChecked ? '' : 'Choisir une sorte de pizza.');
        if (pizzaInvalid) pizzaInvalid.style.display = anyChecked ? 'none' : 'block';
      }
    });
  }

  // --- (Optionnel) messages FR pour quelques patterns courants
  const postal = document.getElementById('postal');
  if (postal) {
    postal.addEventListener('input', () => postal.setCustomValidity(''));
    postal.addEventListener('invalid', () => {
      if (postal.validity.valueMissing) postal.setCustomValidity('Ce champ est requis.');
      else postal.setCustomValidity('Format attendu : A1A1A1 (ex. H2X1Y4).');
    });
  }

  const phone = document.getElementById('phone');
  if (phone) {
    phone.addEventListener('input', () => phone.setCustomValidity(''));
    phone.addEventListener('invalid', () => {
      if (phone.validity.valueMissing) phone.setCustomValidity('Ce champ est requis.');
      else phone.setCustomValidity('Téléphone invalide (ex. (514) 555-0123).');
    });
  }

  const email = document.getElementById('email');
  if (email) {
    email.addEventListener('input', () => email.setCustomValidity(''));
    email.addEventListener('invalid', () => {
      if (email.validity.valueMissing) email.setCustomValidity('Ce champ est requis.');
      else email.setCustomValidity('Adresse courriel invalide.');
    });
  }
})();
