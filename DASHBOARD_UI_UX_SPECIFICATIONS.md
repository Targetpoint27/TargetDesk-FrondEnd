# 🎨 Dashboard TargetDesk - Spécifications UI/UX Détaillées

## 📋 Vue d'ensemble

Ce document décrit en détail les spécifications UI/UX pour le dashboard TargetDesk, incluant la consommation de tous les endpoints backend, les interactions utilisateur, et les critères d'acceptation visuels.

---

## 🎯 Dashboard Commercial (Manager)

### 📊 Section Métriques Principales

#### **Widget Clients Actifs**
- **Endpoint** : `GET /api/v1/dashboard/commercial/overview`
- **Données** : `total_active_clients: 150`
- **UI Design** :
  ```
  ┌─────────────────────┐
  │ 👥 Clients Actifs   │
  │                     │
  │      150            │
  │   +12% ce mois      │
  │                     │
  │ [Voir tous] ──────→ │
  └─────────────────────┘
  ```
- **Interactions** :
  - Clic sur la card → Navigation vers `/clients?status=active`
  - Hover → Animation scale + shadow
  - Badge de tendance (vert si positif, rouge si négatif)

#### **Widget Prospects**
- **Endpoint** : `GET /api/v1/dashboard/commercial/overview`
- **Données** : `total_prospects: 45`
- **UI Design** :
  ```
  ┌─────────────────────┐
  │ 🎯 Prospects        │
  │                     │
  │       45            │
  │   Pipeline actif    │
  │                     │
  │ [Pipeline] ──────→  │
  └─────────────────────┘
  ```
- **Interactions** :
  - Clic → Navigation vers `/clients?type=prospect`
  - Indicateur de priorité (points colorés)

#### **Widget Nouveaux Clients**
- **Endpoint** : `GET /api/v1/dashboard/commercial/overview`
- **Données** : `new_clients_this_period: 12`
- **UI Design** :
  ```
  ┌─────────────────────┐
  │ ⭐ Nouveaux         │
  │                     │
  │       12            │
  │   Ce mois          │
  │                     │
  │ [Onboarding] ────→  │
  └─────────────────────┘
  ```
- **Interactions** :
  - Animation counter sur chargement
  - Clic → Liste des nouveaux clients

#### **Widget Fournisseurs**
- **Endpoint** : `GET /api/v1/dashboard/commercial/overview`
- **Données** : `total_suppliers: 25`
- **UI Design** :
  ```
  ┌─────────────────────┐
  │ 🏭 Fournisseurs     │
  │                     │
  │       25            │
  │   Partenaires      │
  │                     │
  │ [Gérer] ──────────→ │
  └─────────────────────┘
  ```

### 📈 Section Graphiques et Analyses

#### **Graphique d'Évolution Clients**
- **Endpoint** : `GET /api/v1/dashboard/commercial/clients-evolution?period=month`
- **Type** : Graphique linéaire (Chart.js)
- **Données** :
  ```json
  {
    "evolution_data": [
      {
        "date": "2026-01-01",
        "total_clients": 145,
        "new_clients": 5,
        "active_clients": 140
      }
    ]
  }
  ```
- **UI Specs** :
  ```
  ┌─────────────────────────────────────┐
  │ 📈 Évolution des Clients            │
  │ [Mois] [Trimestre] [Année] [Custom] │
  │                                     │
  │     160 ┌─┐                         │
  │         │ │   ┌─┐                   │
  │     150 │ └─┐ │ │                   │
  │         │   └─┘ │                   │
  │     140 └───────┴───                │
  │         Jan Feb Mar Apr             │
  │                                     │
  │ ● Total clients  ● Nouveaux        │
  └─────────────────────────────────────┘
  ```
- **Interactions** :
  - Hover points → Tooltip avec détails
  - Filtres période → Rechargement dynamique
  - Zoom et pan sur desktop
  - Responsive : Stack sur mobile

#### **Graphiques de Répartition**
- **Endpoint** : `GET /api/v1/dashboard/commercial/stats`
- **Types** : Camembert + Barres

##### **Répartition par Statut (Donut Chart)**
```
┌─────────────────────────┐
│ Clients par Statut      │
│        ████             │
│      ██    ██           │
│     █  80%  █           │
│     █ Actif █           │
│      ██ ████            │
│        ████             │
│                         │
│ ● Actifs (120) 80%     │
│ ● Inactifs (30) 20%    │
└─────────────────────────┘
```

##### **Répartition par Secteur (Barres)**
```
┌─────────────────────────┐
│ Clients par Secteur     │
│                         │
│ Technology  ████████    │
│ Commerce    ██████      │
│ Services    ████        │
│ Industrie   ██          │
│                         │
│ 0    10    20    30     │
└─────────────────────────┘
```

### 🔄 Section Activité et Interactions

#### **Feed Interactions Récentes**
- **Endpoint** : `GET /api/v1/dashboard/commercial/interactions/recent?limit=10`
- **UI Design** :
  ```
  ┌─────────────────────────────────────┐
  │ 💬 Interactions Récentes            │
  │                                     │
  │ 📧 [Avatar] Email envoyé        2h  │
  │    Client ABC Corp                  │
  │    "Proposal follow-up..."          │
  │                                     │
  │ 📞 [Avatar] Appel terminé       4h  │
  │    Prospect XYZ Ltd                 │
  │    "Interested in demo..."          │
  │                                     │
  │ 📅 [Avatar] RDV planifié        1j  │
  │    Nouveau prospect                 │
  │    "Product presentation"           │
  │                                     │
  │ [Voir toutes] ──────────────────→   │
  └─────────────────────────────────────┘
  ```
- **Interactions** :
  - Clic sur interaction → Détail complet
  - Avatars utilisateurs dynamiques
  - Badges de priorité colorés
  - Scroll infini pour plus d'interactions

#### **Widget Clients Inactifs**
- **Endpoint** : `GET /api/v1/dashboard/commercial/clients/inactive?days=30&limit=5`
- **UI Design** :
  ```
  ┌─────────────────────────────────────┐
  │ ⚠️  Clients Inactifs (30+ jours)    │
  │                                     │
  │ 🔴 Entreprise ACME      45 jours    │
  │    Dernier contact: Email           │
  │    [Relancer] [Programmer]          │
  │                                     │
  │ 🟡 Tech Solutions       32 jours    │
  │    Dernier contact: Appel           │
  │    [Relancer] [Programmer]          │
  │                                     │
  │ [Voir tous] ──────────────────→     │
  └─────────────────────────────────────┘
  ```
- **Interactions** :
  - Couleurs dégradées selon urgence (rouge > orange > jaune)
  - Actions rapides (Email, Appel, RDV)
  - Notifications push si nouveaux inactifs

---

## 👤 Dashboard Personnel (Commercial)

### 🎯 Section Métriques Personnelles

#### **Vue d'Ensemble Personnelle**
- **Endpoint** : `GET /api/v1/dashboard/personal/overview?period=month`
- **Layout** : Grid 2x2 sur desktop, stack sur mobile

```
┌──────────────┬──────────────┐
│ 👤 Mes Clients│ 🎯 Prospects │
│     25        │     8        │
│ Actifs        │ En cours     │
└──────────────┼──────────────┤
│ 📅 RDV       │ ⚠️ En retard │
│     5         │     3        │
│ À venir       │ Actions      │
└──────────────┴──────────────┘
```

#### **Widget "À Faire Aujourd'hui"**
- **Endpoint** : `GET /api/v1/dashboard/personal/tasks/today`
- **UI Design** :
  ```
  ┌─────────────────────────────────────┐
  │ ✅ À faire aujourd'hui              │
  │                                     │
  │ 📅 RDV (3)                         │
  │ ┌─ 09:00 Demo produit               │
  │ │  Client: ACME Corp                │
  │ │  📍 Bureau client                 │
  │ │  🔵 Priorité haute                │
  │ └─ [Rejoindre] [Préparer]           │
  │                                     │
  │ ┌─ 14:00 Négociation contrat        │
  │ │  Prospect: Tech Solutions          │
  │ │  📞 Visioconférence               │
  │ │  🟡 Priorité moyenne              │
  │ │  ⏰ Dans 2h                       │
  │ └─ [Rejoindre] [Notes]              │
  │                                     │
  │ 🔄 Follow-ups en retard (2)        │
  │ ⚠️  XYZ Ltd - 2 jours de retard    │
  │     "Relance proposition"           │
  │     [Appeler] [Email] [Reporter]    │
  │                                     │
  │ 📊 Résumé                          │
  │ • Tâches urgentes: 5               │
  │ • Taux completion: 66.7%           │
  └─────────────────────────────────────┘
  ```
- **Interactions** :
  - Timeline interactive avec étapes
  - Quick actions contextuelles
  - Notifications push 15min avant RDV
  - Drag & drop pour reporter

### 📊 Section Performance Personnelle

#### **Évolution du Portefeuille**
- **Endpoint** : `GET /api/v1/dashboard/personal/portfolio?period=month`
- **UI Design** :
  ```
  ┌─────────────────────────────────────┐
  │ 📈 Mon Portefeuille                 │
  │                                     │
  │     25 ┌─┐                         │
  │        │ │   ┌─┐                   │
  │     20 │ └─┐ │ │ ← +2 ce mois      │
  │        │   └─┘ │                   │
  │     15 └───────┴───                │
  │        Jan Feb Mar Apr             │
  │                                     │
  │ 📊 Métriques Performance            │
  │ • Interactions/client: 2.5         │
  │ • Jour le + actif: Mardi          │
  │ • Taux conversion: 75.5%           │
  │ • Clients avec interactions: 15/20 │
  └─────────────────────────────────────┘
  ```

#### **Rendez-vous à Venir**
- **Endpoint** : `GET /api/v1/dashboard/personal/appointments/upcoming?days=7`
- **UI Design** :
  ```
  ┌─────────────────────────────────────┐
  │ 📅 Mes RDV (7 prochains jours)     │
  │                                     │
  │ Aujourd'hui (3)                    │
  │ ├─ 09:00 Demo ACME Corp 🔵         │
  │ ├─ 14:00 Nego Tech Sol 🟡         │
  │ └─ 16:30 Follow-up ABC 🟢          │
  │                                     │
  │ Demain (2)                         │
  │ ├─ 10:00 Présentation XYZ 🔵      │
  │ └─ 15:00 Closing DEF Ltd 🔴       │
  │                                     │
  │ Cette semaine (4)                  │
  │ └─ [Voir planning complet]          │
  └─────────────────────────────────────┘
  ```

#### **Interactions Récentes Personnelles**
- **Endpoint** : `GET /api/v1/dashboard/personal/interactions/recent?limit=5`
- **UI Design** : Similaire au feed commercial mais filtré sur l'utilisateur

---

## 🎨 Spécifications Design System

### 🎨 Palette de Couleurs

```scss
:root {
  // Couleurs primaires
  --primary-blue: #3B82F6;
  --primary-blue-light: #93C5FD;
  --primary-blue-dark: #1D4ED8;

  // Couleurs sémantiques
  --success-green: #10B981;
  --warning-orange: #F59E0B;
  --danger-red: #EF4444;
  --info-cyan: #06B6D4;

  // Couleurs neutres
  --gray-50: #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
}
```

### 📐 Système de Grille et Espacements

```scss
// Espacements
--space-1: 0.25rem; // 4px
--space-2: 0.5rem;  // 8px
--space-3: 0.75rem; // 12px
--space-4: 1rem;    // 16px
--space-6: 1.5rem;  // 24px
--space-8: 2rem;    // 32px
--space-12: 3rem;   // 48px

// Grid Dashboard
.dashboard-grid {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.widget-large {
  grid-column: span 2;
}

@media (max-width: 768px) {
  .widget-large {
    grid-column: span 1;
  }
}
```

### 🎨 Composants UI

#### **Metric Card**
```scss
.metric-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px 0 rgba(0, 0, 0, 0.15);
  }

  .metric-icon {
    width: 48px;
    height: 48px;
    background: var(--primary-blue-light);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }

  .metric-value {
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--gray-900);
    line-height: 1;
    margin-bottom: 4px;
  }

  .metric-label {
    font-size: 0.875rem;
    color: var(--gray-600);
    font-weight: 500;
  }

  .metric-trend {
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 8px;

    &.positive { color: var(--success-green); }
    &.negative { color: var(--danger-red); }
  }
}
```

#### **Interactive Button**
```scss
.action-button {
  background: var(--primary-blue);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--primary-blue-dark);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &.secondary {
    background: var(--gray-100);
    color: var(--gray-700);

    &:hover {
      background: var(--gray-200);
    }
  }
}
```

---

## 📱 Design Responsive

### 🖥️ Desktop (1200px+)
- **Grid** : 4 colonnes pour métriques
- **Widgets larges** : 2 colonnes
- **Sidebar** : Navigation persistante
- **Hover effects** : Complets

### 📱 Tablet (768px - 1199px)
- **Grid** : 2 colonnes adaptatives
- **Widgets** : Stack automatique
- **Navigation** : Collapsible
- **Touch targets** : 44px minimum

### 📱 Mobile (< 768px)
- **Grid** : 1 colonne
- **Stack vertical** : Tous widgets
- **Navigation** : Bottom tab bar
- **Swipe gestures** : Navigation entre sections

```scss
// Breakpoints
@media (min-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1199px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .metric-card {
    padding: 16px;
  }

  .metric-value {
    font-size: 1.875rem;
  }
}
```

---

## ⚡ États et Interactions

### 🔄 Loading States

#### **Skeleton Loading**
```html
<div class="skeleton-card">
  <div class="skeleton-header">
    <div class="skeleton-avatar"></div>
    <div class="skeleton-lines">
      <div class="skeleton-line skeleton-line-short"></div>
      <div class="skeleton-line skeleton-line-long"></div>
    </div>
  </div>
  <div class="skeleton-content">
    <div class="skeleton-line"></div>
    <div class="skeleton-line"></div>
    <div class="skeleton-line skeleton-line-short"></div>
  </div>
</div>
```

#### **Progressive Loading**
1. **Métriques** → Chargement immédiat (cache local)
2. **Graphiques** → Skeleton puis animation d'apparition
3. **Listes** → Pagination avec lazy loading

### ⚠️ Error States

#### **Retry Pattern**
```html
<div class="error-state">
  <div class="error-icon">⚠️</div>
  <h3>Erreur de chargement</h3>
  <p>Impossible de récupérer les données</p>
  <button onclick="retry()" class="retry-button">
    🔄 Réessayer
  </button>
</div>
```

### 🔔 Notifications

#### **Toast Notifications**
- **Success** : Vert, auto-dismiss 3s
- **Error** : Rouge, manual dismiss
- **Info** : Bleu, auto-dismiss 5s
- **Warning** : Orange, manual dismiss

#### **Real-time Updates**
- **WebSocket** : Notifications push
- **Badge counters** : Nouveau contenu
- **Pulse animations** : Attention

---

## 📊 Analytics et Tracking

### 🎯 Métriques UX à Tracker

#### **Performance**
```javascript
// Temps de chargement
performance.mark('dashboard-start');
// ... chargement ...
performance.mark('dashboard-end');
const loadTime = performance.measure('dashboard-load', 'dashboard-start', 'dashboard-end');

// Time to Interactive
window.addEventListener('load', () => {
  const tti = performance.now();
  analytics.track('dashboard_tti', { time: tti });
});
```

#### **Engagement**
```javascript
// Clics sur widgets
document.addEventListener('click', (e) => {
  if (e.target.closest('.metric-card')) {
    analytics.track('widget_click', {
      widget: e.target.closest('.metric-card').dataset.widget,
      timestamp: Date.now()
    });
  }
});

// Temps passé par section
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      analytics.track('section_view', {
        section: entry.target.dataset.section,
        duration: Date.now()
      });
    }
  });
});
```

### 📈 KPIs de Succès UX

#### **Adoption**
- **Utilisation quotidienne** : > 80% des users
- **Temps par session** : > 5 minutes
- **Actions par visite** : > 3 clics

#### **Performance**
- **First Paint** : < 1.5s
- **Time to Interactive** : < 3s
- **Core Web Vitals** : Vert sur tous

#### **Satisfaction**
- **NPS Dashboard** : > 8/10
- **Taux de rebond** : < 20%
- **Support tickets UI** : < 1% des sessions

---

## 🚀 Roadmap et Améliorations

### 🎯 Phase 1 : MVP (Actuel)
- ✅ Métriques de base
- ✅ Graphiques simples
- ✅ Interactions récentes
- ✅ Responsive design

### 🎯 Phase 2 : Enrichissement
- 🔄 **Widgets personnalisables**
- 🔄 **Drag & drop dashboard**
- 🔄 **Filtres avancés**
- 🔄 **Export PDF/Excel**

### 🎯 Phase 3 : Intelligence
- 📅 **Recommandations IA**
- 📅 **Prédictions trends**
- 📅 **Alertes intelligentes**
- 📅 **Chatbot intégré**

### 🎯 Phase 4 : Collaboration
- 📅 **Partage de dashboards**
- 📅 **Commentaires collaboratifs**
- 📅 **Annotations graphiques**
- 📅 **Notifications teams**

---

## 📚 Documentation Technique

### 🛠️ Stack Technique
- **Frontend** : Angular 18+ avec Signals
- **Charts** : Chart.js / D3.js
- **Styling** : Tailwind CSS / SCSS
- **State** : NgRx ou Akita
- **HTTP** : Angular HttpClient avec interceptors
- **Testing** : Jasmine + Karma + Cypress

### 🔗 Intégration Backend
- **Base URL** : `http://localhost:8000/api/v1`
- **Auth** : Bearer Token (Laravel Sanctum)
- **Cache** : Service Worker + localStorage
- **Real-time** : WebSocket ou Server-Sent Events

### 📖 Standards de Code
- **TypeScript Strict** : Mode activé
- **ESLint + Prettier** : Configuration stricte
- **Component Architecture** : Standalone + OnPush
- **Testing Coverage** : > 80%

---

Cette spécification complète guide l'implémentation d'un dashboard moderne, performant et centré utilisateur pour TargetDesk CRM.