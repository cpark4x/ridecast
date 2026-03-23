# Design System Migration Plan: Light Mode + Amber-Orange + Geist Sans

**Status:** Planning  
**Target Date:** Q2 2026  
**Scope:** Complete design system overhaul  
**Last Updated:** 2026-03-09

## Overview

This plan outlines the migration of the Ridecast design system to light mode as the primary theme, amber-orange accent colors, and Geist Sans typography. This includes fixing the CSS token architecture to support flexible theming.

## 17-Task Implementation Plan

### Phase 1: Foundation (Tasks 1-4)

**Task 1: Audit Current Design System**
- Document existing color palette, spacing, typography, and component styles
- Identify all files using current design tokens
- Map dependencies between components and tokens
- Estimated effort: 2-3 days

**Task 2: Define Light Mode Color Palette**
- Create comprehensive light mode color scale
- Define neutral grays (50-950 scale)
- Define surface, background, and accent backgrounds
- Establish contrast ratios for accessibility (WCAG AA/AAA)
- Estimated effort: 2-3 days

**Task 3: Define Amber-Orange Accent Color System**
- Create primary accent palette (amber-orange range)
- Define secondary accent colors if needed
- Create hover, active, disabled states for accents
- Test against light mode backgrounds
- Estimated effort: 1-2 days

**Task 4: Select and Configure Geist Sans**
- Add Geist Sans font files to project
- Set up @font-face declarations
- Test font rendering at various sizes
- Create font-weight and line-height scales
- Estimated effort: 2-3 days

### Phase 2: CSS Token Architecture (Tasks 5-7)

**Task 5: Refactor CSS Token Architecture**
- Create semantic token structure (colors, spacing, typography, sizing, shadows)
- Implement CSS custom properties (CSS variables) for all tokens
- Organize tokens by category and scale
- Create fallback values for unsupported browsers
- Estimated effort: 3-4 days

**Task 6: Create Token Documentation**
- Document all token names, values, and use cases
- Create token reference guide for developers
- Add examples of token usage in components
- Create Figma/design tool token mapping
- Estimated effort: 2-3 days

**Task 7: Build Token Generation Pipeline**
- Set up automated token generation from source file
- Create build step to generate CSS and JS files
- Test token consistency across outputs
- Document token update workflow
- Estimated effort: 2-3 days

### Phase 3: Component Migration (Tasks 8-11)

**Task 8: Migrate Core Components to New Tokens**
- Update Button, Input, Select, Checkbox, Radio, Toggle components
- Update Card, Container, Panel, Modal components
- Use new semantic tokens throughout
- Test component variations with new tokens
- Estimated effort: 4-5 days

**Task 9: Update Theme Configuration**
- Update theme provider with new token values
- Set light mode as default/primary
- Configure theme switching mechanism
- Test theme persistence and switching
- Estimated effort: 2-3 days

**Task 10: Migrate Page Layouts**
- Update header, sidebar, footer, navigation components
- Apply light mode and new typography
- Test layouts at multiple breakpoints
- Verify dark mode still functions (if supported)
- Estimated effort: 3-4 days

**Task 11: Update Icon and Asset Library**
- Review icons for light mode appropriateness
- Update SVG fill colors to use token variables
- Create icon color utility classes
- Test icon contrast in light mode
- Estimated effort: 2-3 days

### Phase 4: Testing and Validation (Tasks 12-14)

**Task 12: Unit and Component Testing**
- Create snapshot tests for updated components
- Test color contrast ratios (WCAG compliance)
- Test responsive behavior at all breakpoints
- Test theme switching functionality
- Estimated effort: 3-4 days

**Task 13: End-to-End and Integration Testing**
- Test complete user flows in new design system
- Test form submissions, validations, errors
- Test navigation and page transitions
- Verify no visual regressions
- Estimated effort: 3-4 days

**Task 14: Cross-Browser and Device Testing**
- Test on Chrome, Firefox, Safari, Edge
- Test on mobile devices (iOS/Android)
- Test on tablets and larger screens
- Verify print styles (if applicable)
- Estimated effort: 2-3 days

### Phase 5: Deployment and Handoff (Tasks 15-17)

**Task 15: Create Migration Guide and Documentation**
- Write developer guide for using new design system
- Document token naming conventions
- Create copy-paste examples for common patterns
- Record video walkthroughs if needed
- Estimated effort: 2-3 days

**Task 16: Staged Rollout to Production**
- Deploy to staging environment
- Get stakeholder review and approval
- Deploy to production with feature flag (if needed)
- Monitor for issues and user feedback
- Estimated effort: 2-3 days

**Task 17: Post-Launch Iteration and Cleanup**
- Address any reported issues or edge cases
- Optimize performance if needed
- Archive old design system files
- Schedule design system training for team
- Estimated effort: 2-3 days

## Success Criteria

- ✅ All components render correctly in light mode
- ✅ Amber-orange accent used consistently across product
- ✅ Geist Sans typography applied to all text
- ✅ All new tokens documented and accessible to developers
- ✅ WCAG AA contrast compliance verified
- ✅ No visual regressions from current design
- ✅ Theme switching (if applicable) works smoothly
- ✅ Performance metrics maintained or improved
- ✅ Team trained and comfortable with new system

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Large codebase requires extensive updates | High | Use automated scripts to find/replace old tokens; prioritize critical components first |
| Color contrast issues in light mode | Medium | Create comprehensive contrast matrix; automate WCAG checking in CI |
| Font rendering differences across browsers | Medium | Test early and often; use fallback fonts; consider font loading strategy |
| Breaking changes for consumers/integrators | High | Provide migration guide; maintain backwards compatibility window if possible |
| Stakeholder approval delays | Medium | Get early feedback; schedule regular review sessions |

## Timeline Estimate

- **Phase 1:** 7-11 days
- **Phase 2:** 7-10 days
- **Phase 3:** 12-15 days
- **Phase 4:** 8-11 days
- **Phase 5:** 6-9 days

**Total: 40-56 days (8-11 weeks)** depending on team size and parallel work

## Dependencies

- Figma/design tool updated with new tokens (pre-requisite)
- Design system library/component package (if applicable)
- Stakeholder alignment on light mode + amber-orange direction
- Sufficient development capacity (recommend 1-2 FTE)

## Notes

- This plan assumes a primarily light mode implementation. If dark mode support is needed, add 20-30% additional effort.
- Token architecture improvements will benefit future design iterations and make theme updates faster.
- Consider using a design token management tool (Tokens Studio, Figma Tokens, etc.) to automate portions of this work.
