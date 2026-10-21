---
name: Nested npm imports
description: Package-installation scope when an imported application lives below the repository root.
---

The language-package installer does not infer a nested application directory from a `cd` in the run command; it targets the workspace root and can initialize a separate root npm project.

**Why:** During deployment debugging, an installation intended for the imported app created unrelated root manifests instead of updating the app's dependencies.

**How to apply:** Preserve the imported layout. Check which manifest an installation will modify, and scope package-manager operations explicitly to the existing application directory when the installer cannot target it.
