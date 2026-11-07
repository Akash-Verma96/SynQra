import cors from 'cors'
import express, { json } from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serverConfig } from './config/index.js'
import { setUpCrwalWorker, setUpIndexWorker, setUpQUERYWorker, setUpYtWorker } from './workers/index.worker.js';
import indexRouter from './routers/index.router.js';
import cookieParser from 'cookie-parser';

const app = express()
app.use(express.json())
app.use(cookieParser());

const port = serverConfig.PORT;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/uploads', express.static(uploadsDir));
app.use('/api/v1', indexRouter);

app.get('/',(req,res) => {
    res.json({message: "Ok"})
})


app.listen(port,()=>{
    setUpIndexWorker();
    setUpQUERYWorker();
    setUpCrwalWorker();
    setUpYtWorker();
    console.log(`Server is listening on port: ${port}`)
})
