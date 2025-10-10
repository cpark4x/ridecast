# Sitemap: [Application Name]

Complete map of all routes and pages in the application.

---

## Public Routes

Routes accessible without authentication.

### Landing & Marketing

```
/                  - Homepage/Landing page
/about            - About page
/pricing          - Pricing page
/blog             - Blog listing
/blog/:slug       - Individual blog post
```

### Authentication

```
/login            - Login page
/signup           - Registration page
/forgot-password  - Password reset request
/reset-password   - Password reset form
```

---

## Authenticated Routes

Routes requiring user authentication.

### Dashboard

```
/dashboard        - User dashboard/home
```

### [Section 1 Name]

```
/section           - Section overview/list
/section/:id       - Section detail
/section/:id/edit  - Edit section
/section/new       - Create new
```

### [Section 2 Name]

```
/section           - Section overview/list
/section/:id       - Section detail
/section/:id/sub   - Sub-section
```

### Settings

```
/settings              - Settings overview
/settings/profile      - User profile
/settings/account      - Account settings
/settings/security     - Security settings
/settings/preferences  - User preferences
/settings/billing      - Billing (if applicable)
```

---

## Dynamic Segments

| Segment   | Type   | Description             | Example            |
| --------- | ------ | ----------------------- | ------------------ |
| `:id`     | UUID   | Resource identifier     | `abc-123-def-456`  |
| `:slug`   | string | URL-friendly identifier | `hello-world`      |
| `:userId` | UUID   | User identifier         | `user-789-abc-123` |

---

## Query Parameters

### Common Patterns

**Pagination:**

```
?page=1&limit=20
```

**Filtering:**

```
?filter[status]=active
?filter[date]=2024-01
```

**Sorting:**

```
?sort=createdAt&order=desc
```

**Search:**

```
?q=search+query
?search=term
```

**View Mode:**

```
?view=grid
?view=list
```

**Modal/Overlay:**

```
?modal=create
?panel=settings
?drawer=notifications
```

---

## Route Organization

### Hierarchy

```
Public
├── Landing (/)
├── Auth (/login, /signup)
└── Marketing (/about, /pricing)

Authenticated
├── Dashboard (/dashboard)
├── Main Features
│   ├── Feature 1 (/feature-1/*)
│   ├── Feature 2 (/feature-2/*)
│   └── Feature 3 (/feature-3/*)
└── Settings (/settings/*)
```

---

## Route Guards

### Authentication Requirements

| Route Pattern | Auth Required | Redirect If Not Auth          |
| ------------- | ------------- | ----------------------------- |
| `/`           | No            | -                             |
| `/login`      | No            | `/dashboard` if authenticated |
| `/dashboard`  | Yes           | `/login`                      |
| `/settings/*` | Yes           | `/login`                      |

### Permission Requirements

| Route Pattern     | Required Permission | Fallback        |
| ----------------- | ------------------- | --------------- |
| `/admin/*`        | `admin` role        | 403 or redirect |
| `/feature/create` | `create` permission | Disabled UI     |

---

## Special Routes

### Error Pages

```
/404           - Not found
/403           - Forbidden
/500           - Server error
/offline       - Offline mode
```

### Utility Pages

```
/loading       - Loading state
/maintenance   - Maintenance mode
```

---

## External Routes

### Documentation

```
https://docs.example.com
```

### Support

```
https://support.example.com
https://status.example.com
```

### Social

```
https://twitter.com/handle
https://github.com/org
```

---

## Deep Links

### Shareable Links

[Links that can be shared externally]

**Resource Links:**

```
/resource/:id
→ Opens specific resource
→ Requires appropriate permissions
```

**Invite Links:**

```
/invite/:token
→ Team invitation
→ Auto-accepts and redirects
```

### App Links

[Special deep links for mobile apps]

```
app://open/resource/:id
```

---

## Route Metadata

### SEO Metadata

| Route    | Title        | Description   | OG Image    |
| -------- | ------------ | ------------- | ----------- |
| `/`      | [Page title] | [Description] | [Image URL] |
| `/about` | [Page title] | [Description] | [Image URL] |

### Analytics

**Page View Tracking:**

- All routes tracked automatically
- Special events for conversions
- Funnel tracking for key flows

---

## Migration Notes

### Deprecated Routes

| Old Route   | New Route   | Redirect | Notes               |
| ----------- | ----------- | -------- | ------------------- |
| `/old-path` | `/new-path` | 301      | [Reason for change] |
| `/legacy`   | `/current`  | 301      | [Reason for change] |

### Planned Routes

| Route        | Purpose   | Target Release | Status    |
| ------------ | --------- | -------------- | --------- |
| `/feature-x` | [Purpose] | Q2 2024        | Planned   |
| `/feature-y` | [Purpose] | Q3 2024        | In Design |

---

## Technical Implementation

### Router Configuration

**Library:** [React Router / Next.js / etc.]
**Version:** [Version number]
**Config Location:** [`/app/routes.tsx`]

### Route Components

| Pattern       | Component       | Layout         |
| ------------- | --------------- | -------------- |
| `/dashboard`  | `DashboardPage` | `AuthLayout`   |
| `/settings/*` | `SettingsPage`  | `AuthLayout`   |
| `/login`      | `LoginPage`     | `PublicLayout` |

---

## Related Documentation

- [Routes Configuration](routes.json) - Technical route definitions
- [Navigation Components](nav-components.md) - UI implementation
- [Permissions Matrix](permissions-matrix.md) - Access control
- [Deep Links](deeplinks.md) - Detailed deep linking patterns

---

## Metadata

**Created:** [Date]
**Last Updated:** [Date]
**Owner:** [Team/Person]
**Review Cadence:** [When to review - e.g., quarterly]

---

## Change History

| Version | Date   | Author   | Changes                  |
| ------- | ------ | -------- | ------------------------ |
| v1.0    | [Date] | [Author] | Initial sitemap created. |
