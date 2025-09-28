/**
 * ---------------------------------------------------------
 * Nom du fichier : app.js
 * Projet         : Pizzeria (Lab 4)
 * Description    : Point d’entrée du serveur Express,
 *                  configuration des routes et middleware.
 * Auteur         : Sami Abdelkhalek
 * ---------------------------------------------------------
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import { body, validationResult } from 'express-validator';
import fs from 'fs';
import { PRICES } from './prices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Templating + middlewares
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));

// Mini “BD” JSON
const DB_PATH = path.join(__dirname, 'storage', 'db.json');
function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { clients: {} };
  }
}
function writeDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

// Libellés
const PIZZA_LABELS = {
  hawaiienne: 'Hawaïenne',
  alldressed: 'All-dressed',
  sicilienne: 'Sicilienne'
};
const SIZE_LABELS = { small: 'Small', medium: 'Medium', large: 'Large' };

// Calcul prix
function computePrice({ pizza, qty, size, extrasCount }) {
  const base = PRICES.pizzas[pizza] ?? 0;
  const sizeMult = PRICES.sizes[size] ?? 1;
  const extras = (extrasCount || 0) * PRICES.extraIngredient;
  const beforeTaxes = (base + extras) * sizeMult * qty;
  const taxes = beforeTaxes * PRICES.tax;
  const total = beforeTaxes + taxes;
  return {
    beforeTaxes: beforeTaxes.toFixed(2),
    taxes: taxes.toFixed(2),
    total: total.toFixed(2)
  };
}

// Regex validations
const PHONE_REGEX = /^[0-9()\-\s]+$/;
const POSTAL_REGEX = /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/;

// Routes
app.get('/', (req, res) => {
  res.render('pages/index', {
    PIZZA_LABELS,
    SIZE_LABELS,
    errors: {},
    old: {}
  });
});

app.post(
  '/commander',
  [
    body('pizza').isIn(Object.keys(PIZZA_LABELS)).withMessage('Choisir une sorte de pizza.'),
    body('qty').isInt({ min: 1, max: 99 }).withMessage('Quantité 1–99.'),
    body('size').isIn(Object.keys(SIZE_LABELS)).withMessage('Choisir une taille.'),
    body('address').isLength({ min: 5 }).withMessage('Adresse trop courte.'),
    body('postal').matches(POSTAL_REGEX).withMessage('Code postal A1A1A1.'),
    body('firstname').isLength({ min: 1 }).withMessage('Prénom requis.'),
    body('lastname').isLength({ min: 1 }).withMessage('Nom requis.'),
    body('phone').matches(PHONE_REGEX).withMessage('Téléphone invalide.'),
    body('email').isEmail().withMessage('Courriel invalide.'),
    body('paymode').isLength({ min: 1 }).withMessage('Mode de paiement requis.')
  ],
  (req, res) => {
    const errors = validationResult(req);
    const fields = req.body;

    const extras = Array.isArray(fields.extras)
      ? fields.extras
      : (fields.extras ? [fields.extras] : []);

    const clean = {
      pizza: fields.pizza,
      qty: Number(fields.qty),
      size: fields.size,
      extras,
      address: String(fields.address || '').trim(),
      postal: String(fields.postal || '').toUpperCase().replace(/\s+/g, ''),
      firstname: String(fields.firstname || '').trim(),
      lastname: String(fields.lastname || '').trim(),
      phone: String(fields.phone || '').trim(),
      email: String(fields.email || '').trim(),
      paymode: String(fields.paymode || '').trim()
    };

    if (!errors.isEmpty()) {
      const mapped = errors.mapped();
      return res.status(400).render('pages/index', {
        PIZZA_LABELS,
        SIZE_LABELS,
        errors: mapped,
        old: clean
      });
    }

    // Calcul du prix
    const price = computePrice({
      pizza: clean.pizza,
      qty: clean.qty,
      size: clean.size,
      extrasCount: clean.extras.length
    });

    // Sauvegarde historique (clé = téléphone)
    const db = readDB();
    const key = clean.phone.replace(/\D/g, '');
    if (!db.clients[key]) {
      db.clients[key] = {
        profile: {
          firstname: clean.firstname,
          lastname: clean.lastname,
          address: clean.address,
          postal: clean.postal,
          email: clean.email,
          phone: clean.phone
        },
        orders: []
      };
    } else {
      db.clients[key].profile = {
        firstname: clean.firstname,
        lastname: clean.lastname,
        address: clean.address,
        postal: clean.postal,
        email: clean.email,
        phone: clean.phone
      };
    }

    const order = {
      at: new Date().toISOString(),
      pizza: PIZZA_LABELS[clean.pizza],
      size: SIZE_LABELS[clean.size],
      qty: clean.qty,
      extras: clean.extras,
      price
    };
    db.clients[key].orders.unshift(order);
    writeDB(db);

    res.render('pages/resultat', { order, customer: db.clients[key].profile });
  }
);

// Historique
app.get('/historique', (req, res) => {
  const q = (req.query.phone || '').trim();
  let result = null;
  if (q) {
    const db = readDB();
    const key = q.replace(/\D/g, '');
    result = db.clients[key] || null;
  }
  res.render('pages/historique', { query: q, result });
});

// 404
app.use((req, res) => {
  res.status(404).render('pages/404');
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});

// --- API: récupérer un profil par téléphone (pour pré-remplir le formulaire)
app.get('/api/customer', (req, res) => {
  const phone = String(req.query.phone || '').trim();
  if (!phone) return res.json({ ok: false, error: 'missing phone' });

  const db = readDB();
  const key = phone.replace(/\D/g, '');
  const entry = db.clients[key];

  if (!entry) return res.json({ ok: true, found: false });

  return res.json({
    ok: true,
    found: true,
    profile: entry.profile,
    ordersCount: entry.orders.length
  });
});
