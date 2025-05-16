# Nuxt.js Project Guide

## Commands
- Build: `yarn build` (builds for production)
- Dev: `yarn dev` (starts dev server)
- Generate: `yarn generate` (generates static site)
- Preview: `yarn preview` (previews production build)
- Install: `yarn install` (installs dependencies)

## Code Style Guidelines
- **Framework**: Nuxt 3 with Vue 3 and TypeScript
- **Formatting**: Use 2-space indentation in all files
- **Types**: Use TypeScript types for all variables, parameters, and return values
- **Components**: Use the Vue 3 Composition API with `<script setup>` 
- **Naming**: Use PascalCase for components, camelCase for variables/functions
- **Imports**: Group imports by type (Vue core, components, utilities)
- **Error Handling**: Use try/catch blocks for async operations
- **State Management**: Prefer composables over global stores for simpler state
- **File Structure**: Place page components in `/pages`, shared components in `/components`