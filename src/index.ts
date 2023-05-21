import express, { Request, Response } from 'express';
import passport, { authenticate } from 'passport';
import session from 'express-session';
import { Strategy } from 'passport-local';
import argon2 from 'argon2';
import bodyParser from 'body-parser';
import { Equal } from 'typeorm';
import crypto from 'crypto';
import Cryptr from 'cryptr';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.SECRET) {
  throw new Error("SECRET environment var not defined");
} else if (!process.env.DATABASE_TYPE) {
  throw new Error("DATABASE_TYPE environment var not defined");
} else if (!process.env.DATABASE) {
  throw new Error("DATABASE environment var not defined");
}

import { AppDataSource } from "./data-source";
import { User } from "./entity/User";
import { Data } from "./entity/Data";

AppDataSource
    .initialize()
    .then(() => {
        console.log("Data Source has been initialized!")
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    })


const app = express();

app.use(session({
  secret: [process.env.SECRET],
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('public', { extensions: ['html'] }));

async function authUser(username: string, password: string, done) {
  const user = await AppDataSource.getRepository(User).findOne({
    where: { username: username },
  });

  try {
    if (user) {
      if (await argon2.verify(user.password, password)) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } else {
      return done(null, false);
    }
  } catch (error) {
    return done(error);
  }
}
passport.use(new Strategy(authUser))

passport.serializeUser<string>((user, done) => {
  done(null, JSON.stringify(user));
});

passport.deserializeUser(async (user: string, done) => {
  done(null, JSON.parse(user))
});

app.use(function (req: Request, res: Response, next) {
  res.locals.user = req.user as User;
  next();
});

app.get('/user', async (req: Request, res: Response) => {
  const user = await AppDataSource.getRepository(User).findOne({
    where: { username: Equal(res.locals.user?.username) },
  });

  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ message: 'unauthorized' });
  }
});

app.post('/login', passport.authenticate('local', {
  successRedirect: "/",
  failureRedirect: "/login",
}));

app.post('/register', async (req: Request, res: Response) => {
  const user = new User();
  user.username = req.body.username;
  user.password = await argon2.hash(req.body.password);
  const crypt = new Cryptr(req.body.password);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    }
  });
  user.publicKey = publicKey;
  user.privateKey = crypt.encrypt(privateKey);
  await AppDataSource.manager.save(user);

  res.redirect('/login');
});

app.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    console.log(err);
  });
  res.redirect('/');
});

app.post('/sendData', async (req: Request, res: Response) => {
  if (req.user) {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { username: Equal(req.body.username) },
    })

    if (user) {
      const encrypted = crypto.publicEncrypt({
        key: user.publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      }, Buffer.from(req.body.data)).toString('base64');

      const data = new Data();
      data.from = res.locals.user.username;
      data.to = req.body.username;
      data.data = encrypted;
      AppDataSource.manager.save(data);
    }

    res.redirect('/');
  } else {
    res.status(401).json({ message: 'unauthorized' });
  }
});

app.get('/data/:id', async (req: Request, res: Response) => {
  if (req.user) {
    const data = await AppDataSource.getRepository(Data).findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (data) {
      if (data.to !== res.locals.user?.username) {
        res.status(401).json({ message: 'unauthorized' });
      } else {
        res.status(200).sendFile(path.join(__dirname, '../html/data.html'));
      }
    } else {
      res.status(404).json({ message: 'not found' });
    }
  } else {
    res.status(401).redirect('/login');
  }
});

app.post('/data/:id', async (req: Request, res: Response) => {
  if (req.user) {
    const data = await AppDataSource.getRepository(Data).findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (data) {
      if (data.to !== res.locals.user?.username) {
        res.status(401).json({ message: 'unauthorized' });
      } else {
        const user = await AppDataSource.getRepository(User).findOne({
          where: { username: res.locals.user.username },
        });
        if (user && await argon2.verify(user.password, req.body.password || '')) {
          const crypt = new Cryptr(req.body.password);
          const privateKey = crypt.decrypt(user.privateKey);
          const decrypted = crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
          }, Buffer.from(data.data, 'base64')).toString('ascii');

          res.status(200).json({ data: decrypted, from: data.from });
        } else {
          res.status(401).json({ message: 'unauthorized' });
        }
      }
    } else {
      res.status(404).json({ message: 'not found' });
    }
  } else {
    res.status(401).redirect('/login');
  }
})

app.listen(8000, () => {
  console.log('The application is listening on port 8000!');
});