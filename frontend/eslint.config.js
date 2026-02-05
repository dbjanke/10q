import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import security from 'eslint-plugin-security';

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    js.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            import: importPlugin,
            react,
            'react-hooks': reactHooks,
            'jsx-a11y': jsxA11y,
            security,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...importPlugin.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            ...jsxA11y.configs.recommended.rules,
            ...security.configs.recommended.rules,
            'no-undef': 'off',
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            'react/no-unescaped-entities': 'off',
            'jsx-a11y/click-events-have-key-events': 'off',
            'jsx-a11y/no-static-element-interactions': 'off',
            'jsx-a11y/label-has-associated-control': 'off',
            'jsx-a11y/no-autofocus': 'off',
        },
        settings: {
            react: {
                version: 'detect',
                runtime: 'automatic',
            },
            'import/resolver': {
                typescript: {
                    project: ['./tsconfig.json', './tsconfig.node.json'],
                },
                node: {
                    extensions: ['.js', '.ts', '.tsx'],
                },
            },
        },
    },
    {
        files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                vi: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
];
