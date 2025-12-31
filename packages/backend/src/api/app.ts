// in this app.ts file, we set uped all routes API points for the express application

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import productRoutes from '../features/products/products.routes.js';
import { errorHandler } from '../middlewares/error.js';
//forecasting routes
import forecastingRoutes from '../features/forecasting/forecasting.routes.js';


const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_: Request, res: Response) => res.json({ ok: true }));

app.use('/api/products', productRoutes);
//forecasting routes
app.use('/api/forecasting', forecastingRoutes);


app.use(errorHandler);

export default app;
