import '../../src/style.css';
import { App } from '../../src/App';

const app = new App();
app.init().catch(err => {
  console.error('Failed to initialize Spine Viewer:', err);
});
