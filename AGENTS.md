# Agent Operational Guide: Drug Track

This repository contains a mobile application built with **React Native (Expo)**, **TypeScript**, and **SQLite**.
This guide defines the standard operating procedures, code style, and architectural patterns for all AI agents working on this codebase.

## 1. Environment & Build Commands

### Prerequisites

- Node.js environment
- Expo CLI

### Operational Commands

Run these commands from the project root.

- **Start Development Server:**

  ```bash
  npm start
  ```

  _Note: Use `npm run android` or `npm run ios` to launch on simulators._

- **Linting:**

  ```bash
  npm run lint
  ```

  _Note: Always run lint before submitting changes. Use `npm run lint -- --fix` to auto-fix issues._

- **Formatting:**

  ```bash
  npm run format
  ```

  _Note: Uses Prettier. Ensure code is formatted before committing._

- **Testing:**
  _Currently, no test suite is configured._
  - If asked to write tests, install `jest` and `jest-expo`.
  - Create test files co-located with components (e.g., `Component.test.tsx`).

## 2. Architecture & File Structure

The project is moving away from the default Expo Router structure (`app/`) towards a manual navigation structure in `src/`.

- **Source Root:** `src/`
- **Navigation:** `src/navigation/index.tsx` (Root setup)
- **Screens:** `src/navigation/screens/`
- **Entry Point:** `index.tsx` -> `src/App.tsx`

**Important:** Ignore the `app-example/` directory. It contains legacy template code that is excluded from linting. Focus all development in `src/`.

## 3. Code Style & Conventions

### TypeScript & Typing

- **Strict Mode:** Enabled. Do not use `any`.
- **Interfaces:** Define explicit interfaces for component props, state, and data models.
- **Exports:** Prefer named exports (`export function Component()`) over default exports.

### React Components

- **Functional Components:** Use functional components with Hooks.
- **Hooks Rules:**
  - Standard hooks (`useState`, `useEffect`, `useRef`).
  - Custom hooks should be extracted to `src/hooks/` (create if needed).
- **Props:** Destructure props in the function signature.

### Styling

- **Engine:** `StyleSheet.create` from `react-native`.
- **Constraint:** Avoid inline styles for complex layouts (more than 1-2 properties).
- **Layout:** Use Flexbox (`flex: 1`, `flexDirection`, `justifyContent`, `alignItems`).
- **SafeArea:** Use `SafeAreaView` from `react-native-safe-area-context` for screen containers.

### Database (SQLite)

- **Library:** `expo-sqlite`.
- **Pattern:** Use the `useSQLiteContext` hook to access the database.
- **Queries:** Use async methods (`getAllAsync`, `runAsync`). Avoid synchronous calls on the UI thread.
- **Normalization:** Ensure data types match the defined schema.

### Internationalization (i18n)

- **Library:** `react-i18next`.
- **Usage:** Use the `useTranslation` hook.
  ```typescript
  const { t } = useTranslation();
  <Text>{t('Key Name')}</Text>
  ```

## 4. Example: Component Structure

Follow this template for new screens or complex components:

```typescript
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{t('Action')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
  },
});
```

## 5. Development Workflow for Agents

1.  **Analysis:**
    - Read `package.json` to verify dependencies.
    - Check `src/navigation` to understand the app flow.
    - Use `grep`/`glob` to find related existing code before creating new files.

2.  **Implementation:**
    - Create new files in `src/`.
    - Apply `StyleSheet` styling immediately; do not leave "TODO" styling.
    - Ensure all strings are wrapped in `t()` calls if i18n is active in the file.

3.  **Verification:**
    - Run `npm run lint` to catch errors.
    - Run `npm run format` to ensure consistency.
    - Verify that no `any` types were introduced.

## 6. Error Handling

- **Async/Await:** Wrap async DB calls or API requests in `try/catch` blocks.
- **User Feedback:** Use `Alert.alert()` or simple UI state to inform users of errors.
- **Logging:** Use `console.error` for caught exceptions during development.

## 7. Version Control & Commits

- **Message Format:** `type: description`
  - `feat`: New feature
  - `fix`: Bug fix
  - `refactor`: Code change that neither fixes a bug nor adds a feature
  - `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **Scope:** Keep changes focused. Do not mix refactoring with feature work.
