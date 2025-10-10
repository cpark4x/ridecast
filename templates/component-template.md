# Component: [Component Name]

---

## Overview

**Purpose:** [What this component does]
**Category:** [e.g., Navigation, Form, Display, Layout, Feedback]
**Status:** [Draft/In Review/Approved/Implemented/Deprecated]

---

## Visual Examples

[Insert screenshots, mockups, or links to Figma]

### Default State

![Default State](path-to-image.png)

### Variations

![Variation 1](path-to-image.png)
![Variation 2](path-to-image.png)

---

## Anatomy

```
ComponentName
├── SubComponent1
│   ├── Element1
│   └── Element2
├── SubComponent2
└── SubComponent3
```

**Key Elements:**

1. **Element Name** - Purpose and behavior
2. **Element Name** - Purpose and behavior
3. **Element Name** - Purpose and behavior

---

## Props/API

### Required Props

| Prop       | Type      | Description                              |
| ---------- | --------- | ---------------------------------------- |
| `propName` | `string`  | [Description of what this prop controls] |
| `propName` | `boolean` | [Description of what this prop controls] |

### Optional Props

| Prop       | Type       | Default     | Description                             |
| ---------- | ---------- | ----------- | --------------------------------------- |
| `propName` | `string`   | `'default'` | [Description]                           |
| `propName` | `number`   | `0`         | [Description]                           |
| `callback` | `function` | `undefined` | [Description of when callback is fired] |

### Example Usage

```tsx
<ComponentName requiredProp="value" optionalProp="custom" onAction={(data) => handleAction(data)}>
  <ChildContent />
</ComponentName>
```

---

## States

### Default

[Description of default state and when it appears]

### Hover

[Description of hover state and interactions]

### Active/Selected

[Description of active/selected state]

### Disabled

[Description of disabled state and when it's used]

### Loading

[Description of loading state if applicable]

### Error

[Description of error state if applicable]

### Empty

[Description of empty state if applicable]

---

## Variants

### Variant 1: [Name]

**Use Case:** [When to use this variant]
**Differences:** [How it differs from default]

### Variant 2: [Name]

**Use Case:** [When to use this variant]
**Differences:** [How it differs from default]

---

## Behavior

### Interactions

- **Click:** [What happens on click]
- **Keyboard:** [Keyboard interactions]
- **Touch:** [Touch-specific behavior]

### Animations

- **Transition:** [Describe transitions between states]
- **Duration:** [Animation timing]
- **Easing:** [Easing function used]

---

## Responsive Behavior

### Desktop (> 1024px)

[How component behaves on desktop]

### Tablet (768px - 1024px)

[How component behaves on tablet]

### Mobile (< 768px)

[How component behaves on mobile]

---

## Accessibility

### ARIA

- **Role:** `[role]`
- **Label:** [How it's labeled]
- **States:** [ARIA states used]

### Keyboard Navigation

- **Tab:** [Tab behavior]
- **Enter/Space:** [Activation behavior]
- **Arrow Keys:** [Navigation behavior if applicable]
- **Escape:** [Dismiss behavior if applicable]

### Screen Reader

[How screen readers should announce this component]

---

## Design Tokens

### Colors

```
--component-bg: var(--color-surface)
--component-text: var(--color-text-primary)
--component-border: var(--color-border)
```

### Spacing

```
--component-padding: var(--space-4)
--component-gap: var(--space-2)
```

### Typography

```
--component-font-size: var(--text-base)
--component-font-weight: var(--weight-medium)
```

---

## Usage Guidelines

### When to Use

- [Use case 1]
- [Use case 2]
- [Use case 3]

### When Not to Use

- [Anti-pattern 1]
- [Anti-pattern 2]
- [Alternative component to use instead]

### Best Practices

- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

---

## Implementation Notes

### Technical Considerations

- [Performance consideration]
- [Browser compatibility note]
- [Dependency requirement]

### Code Location

**File:** `[path/to/component.tsx]`
**Storybook:** `[link to storybook story]`

---

## Related Components

- [Related Component 1] - [Relationship description]
- [Related Component 2] - [Relationship description]

---

## Examples in Use

### Example 1: [Scenario]

[Description and code example]

### Example 2: [Scenario]

[Description and code example]

---

## Metadata

**Created:** [Date]
**Last Updated:** [Date]
**Owner:** [Designer/Team]
**Figma:** [Link to Figma file]
**Implementation Status:** [Not Started/In Progress/Complete]

---

## Change History

| Version | Date   | Author   | Changes                 |
| ------- | ------ | -------- | ----------------------- |
| v1.0    | [Date] | [Author] | Initial component spec. |
