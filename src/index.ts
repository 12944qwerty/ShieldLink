import express, { Request, Response } from 'express';

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.sendFile('index.html', { root: 'html' });
});

app.listen(8000, () => {
  console.log('The application is listening on port 8000!');
});