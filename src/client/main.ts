import { mount } from 'svelte';
import './styles/fonts.css';
import './styles/style.css';
import './styles/app.css';
import App from './App.svelte';
import { migrateLegacyKeys } from './lib/storage';
import { initTheme } from './lib/themes';

migrateLegacyKeys();
initTheme();

mount(App, { target: document.getElementById('root')! });
