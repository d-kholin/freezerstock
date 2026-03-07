import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate';
import { seedDatabase } from './db/seed';
import categoriesRouter from './routes/categories';
import itemsRouter from './routes/items';
import historyRouter from './routes/history';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/categories', categoriesRouter);
app.use('/api/item-types', (req, res, next) => {
  req.url = '/item-types' + (req.url === '/' ? '' : req.url);
  categoriesRouter(req, res, next);
});
app.use('/api/items', itemsRouter);
app.use('/api/history', historyRouter);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

async function main() {
  await runMigrations();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`FreezerStock API running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
