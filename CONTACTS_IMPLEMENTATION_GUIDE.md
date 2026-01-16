# Guide d'Implémentation - Module Contacts TargetDesk

## Vue d'ensemble du projet

### Contexte
Implémentation complète du module de gestion des contacts pour l'application TargetDesk frontend Angular, basé sur l'API Contacts backend Laravel.

### Architecture existante
- **Frontend** : Angular 18+ avec standalone components
- **Architecture** : Clean Architecture (Domain, Use Cases, Infrastructure, Facades)
- **État** : RxJS Observables avec facades pour gestion d'état
- **Style** : SCSS avec design système cohérent identique clients/fournisseurs
- **Modèles existants** : Clients et Fournisseurs déjà implémentés

---

## Structure des données Contacts

### Entité Contact
```typescript
interface ContactEntity {
  id: number;
  client_id: number | null;
  supplier_id: number | null;
  civility: 'M.' | 'Mme' | 'Dr.' | 'Prof.' | 'Maître' | null;
  first_name: string;
  last_name: string;
  function: string | null;
  department: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;

  // Propriétés calculées
  full_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  entity_type: 'client' | 'supplier';
  entity_name: string;
  entity_id: string;

  // Relations
  emails: ContactEmail[];
  phones: ContactPhone[];
  client: ClientReference | null;
  supplier: SupplierReference | null;
  creator: UserReference;
}

interface ContactEmail {
  id: number;
  contact_id: number;
  email: string;
  type: 'professionnel' | 'personnel';
  is_primary: boolean;
}

interface ContactPhone {
  id: number;
  contact_id: number;
  phone: string;
  type: 'bureau' | 'mobile' | 'fax' | 'autre';
  is_primary: boolean;
}
```

### Règles métier critiques
1. **Contact principal** : Un seul par entité, premier contact devient automatiquement principal
2. **Emails uniques** : Par entité (client/fournisseur), pas globalement
3. **Protection suppression** : Contact principal protégé si autres contacts existent
4. **Soft delete** : Contacts marqués `is_active: false`
5. **Emails obligatoires** : Au moins un email requis par contact
6. **Téléphones optionnels** : Aucun téléphone requis

---

## API Endpoints disponibles

### Endpoints principaux
- `GET /contacts` - Tous les contacts (vue globale)
- `GET /clients/{id}/contacts` - Contacts d'un client
- `GET /suppliers/{id}/contacts` - Contacts d'un fournisseur
- `POST /clients/{id}/contacts` - Créer contact client
- `POST /suppliers/{id}/contacts` - Créer contact fournisseur
- `GET /contacts/{id}` - Détails d'un contact
- `PUT /contacts/{id}` - Modifier contact
- `PUT /contacts/{id}/make-primary` - Définir comme principal
- `DELETE /contacts/{id}` - Supprimer contact (soft delete)

### Paramètres de recherche globale
- `search` : Recherche dans prénoms, noms, emails
- `entity_type` : Filtrer par 'client' ou 'supplier'
- `page` / `per_page` : Pagination

---

## Plan d'implémentation par étapes

### Phase 1 : Domain Layer
- [ ] `ContactEntity` : Entité principale avec méthodes utilitaires
- [ ] `ContactEmailEntity` : Entité email avec validation
- [ ] `ContactPhoneEntity` : Entité téléphone avec validation
- [ ] `ContactRepository` : Interface repository abstraite
- [ ] Types et enums pour civilité, types email/phone

### Phase 2 : Infrastructure Layer
- [ ] `contact-api.models.ts` : Modèles API (request/response)
- [ ] `ContactApiRepository` : Implémentation repository avec tous endpoints
- [ ] Gestion erreurs et validation API
- [ ] Mappers entités ↔ API models

### Phase 3 : Use Cases
- [ ] `GetContactsUseCase` : Liste globale avec filtres
- [ ] `GetClientContactsUseCase` : Contacts d'un client
- [ ] `GetSupplierContactsUseCase` : Contacts d'un fournisseur
- [ ] `GetContactDetailsUseCase` : Détails contact
- [ ] `CreateContactUseCase` : Création (client/fournisseur)
- [ ] `UpdateContactUseCase` : Modification
- [ ] `MakePrimaryContactUseCase` : Définir principal
- [ ] `DeleteContactUseCase` : Suppression

### Phase 4 : State Management (Facade)
- [ ] `ContactFacade` : Gestion d'état centralisée
- [ ] Observables pour liste, détails, états loading/error
- [ ] Actions CRUD avec mise à jour optimiste
- [ ] Cache intelligent et synchronisation

### Phase 5 : UI Components

#### Page principale Contacts
- [ ] `ContactsPageComponent` : Vue globale tous contacts
- [ ] Filtres : recherche, type entité
- [ ] Tableau avec colonnes : nom, entité, email, téléphone, statut, actions
- [ ] Pagination et loading states

#### Intégration entités existantes
- [ ] Intégrer dans `ClientDetailsModal` : section contacts
- [ ] Intégrer dans `SupplierDetailsModal` : section contacts
- [ ] Liens navigation entre contact et entité parent

#### Modales et formulaires
- [ ] `ContactFormModalComponent` : Création/édition
- [ ] `ContactDetailsModalComponent` : Détails complets
- [ ] Gestion dynamique emails/téléphones multiples
- [ ] Validation temps réel unicité email

#### Composants utilitaires
- [ ] `ContactEmailFormComponent` : Gestion emails multiples
- [ ] `ContactPhoneFormComponent` : Gestion téléphones multiples
- [ ] `ContactStatusBadgeComponent` : Badge statut principal
- [ ] `ContactEntityLinkComponent` : Lien vers entité parent

### Phase 6 : Styles et UX
- [ ] SCSS suivant design système existant clients/fournisseurs
- [ ] Animations et transitions cohérentes
- [ ] Responsive design mobile
- [ ] États loading, empty, error harmonisés

### Phase 7 : Navigation et Routing
- [ ] Route `/contacts` pour vue globale
- [ ] Navigation depuis clients vers contacts
- [ ] Navigation depuis fournisseurs vers contacts
- [ ] Breadcrumbs contextuels

---

## Spécifications UX détaillées

### Page globale Contacts
```
[Header: "Contacts" + Bouton "Nouveau Contact"]
[Filtres: Recherche | Type entité | Réinitialiser]
[Tableau]
  Colonnes:
  - Avatar/Initiales | Nom complet (civilité + prénom nom)
  - Entité (badge client/fournisseur + nom + ID)
  - Email principal (cliquable)
  - Téléphone principal (cliquable)
  - Statut (badge "Principal" si applicable)
  - Actions (voir/éditer/supprimer)
[Pagination]
```

### Intégration dans détails entités
```
[Section "Contacts" dans modal client/fournisseur]
- Contact principal affiché en évidence
- Liste autres contacts
- Bouton "Ajouter contact"
- Actions : voir détails, promouvoir principal, modifier, supprimer
```

### Formulaire contact (création/édition)
```
[Section Informations personnelles]
- Civilité (select) | Prénom* | Nom*
- Fonction | Département

[Section Emails*] (dynamique)
- Email* | Type | Principal (radio)
- [+ Ajouter email]

[Section Téléphones] (optionnelle)
- Téléphone | Type | Principal (radio)
- [+ Ajouter téléphone]

[Actions: Annuler | Enregistrer]
```

---

## Validation et gestion d'erreurs

### Validations côté frontend
- [ ] Prénom/nom requis, format valide
- [ ] Au moins un email requis, format email valide
- [ ] Un seul email/téléphone principal par contact
- [ ] Types email/téléphone valides selon enum backend

### Gestion erreurs API
- [ ] Email déjà utilisé dans entité : message contextuel
- [ ] Contact principal protégé : proposer alternative
- [ ] Entité non trouvée : redirection appropriée
- [ ] Erreurs réseau : retry et fallback

---

## Tests et qualité

### Tests unitaires prioritaires
- [ ] Entités domain : logique métier contact principal
- [ ] Repository : mapping API ↔ entités
- [ ] Use cases : règles métier complexes
- [ ] Facade : gestion état et cache

### Tests d'intégration
- [ ] Création contact avec emails/téléphones multiples
- [ ] Changement contact principal et impact
- [ ] Suppression avec protection métier
- [ ] Navigation entre entités et contacts

---

## Performance et optimisations

### Cache et synchronisation
- [ ] Cache contacts par entité (client/fournisseur)
- [ ] Invalidation cache lors modifications
- [ ] Optimistic updates avec rollback

### Pagination et recherche
- [ ] Pagination serveur pour grandes listes
- [ ] Debounce recherche globale
- [ ] Lazy loading détails contacts

---

## Migration et déploiement

### Intégration progressive
1. Développer module contacts isolé
2. Intégrer dans détails clients existants
3. Intégrer dans détails fournisseurs existants
4. Ajouter page globale contacts
5. Tests utilisateurs et ajustements

### Points d'attention déploiement
- [ ] Compatibilité avec versions API backend
- [ ] Migration données existantes si applicable
- [ ] Formation utilisateurs nouvelles fonctionnalités

---

## Objectifs qualité

### Cohérence design
- **Identique clients/fournisseurs** : Même apparence, comportement, conventions
- **Design système** : Réutiliser composants, styles, patterns existants
- **Responsive** : Mobile-first, adaptation tablette/desktop

### Performance utilisateur
- **Loading states** : Feedback immédiat toutes actions
- **Optimistic updates** : Réactivité interface
- **Error recovery** : Messages clairs, actions correctives

### Maintenabilité code
- **Clean Architecture** : Séparation responsabilités claire
- **Types TypeScript** : Sécurité types, IntelliSense
- **Tests** : Couverture critique, documentation vivante

---

**Status** : 🔄 Prêt pour implémentation
**Priorité** : P1 - Fonctionnalité core business
**Estimation** : 2-3 sprints (selon taille équipe)