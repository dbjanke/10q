import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import security from 'eslint-plugin-security';

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    js.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            import: importPlugin,
            security,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...importPlugin.configs.recommended.rules,
            ...security.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
        settings: {
            'import/resolver': {
                typescript: {
                    project: ['./tsconfig.json'],
                },
                node: {
                    extensions: ['.js', '.ts'],
                },
            },
        },
    },
    {
        files: ['src/stores/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['**/*.test.ts', '**/__tests__/**/*.ts'],
        languageOptions: {
            globals: {
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
