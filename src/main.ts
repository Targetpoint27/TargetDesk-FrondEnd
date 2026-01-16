import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Wait for DOM to be fully loaded before bootstrapping
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrapApplication(App, appConfig)
      .catch((err) => console.error(err));
  });
} else {
  bootstrapApplication(App, appConfig)
    .catch((err) => console.error(err));
}
