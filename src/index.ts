import express, { Request, Response } from 'express';
import passport, { authenticate } from 'passport';
import session from 'express-session';
import { Strategy } from 'passport-local';
import argon2 from 'argon2';
import bodyParser from 'body-parser';

import { AppDataSource } from "./data-source";
import { User } from "./entity/User";
import { Equal } from 'typeorm';

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
  secret: 'uhgveodujhw4028fyhweuobvewvwenowh734gh',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
  done(null, (user as User).username);
});

passport.deserializeUser(async (username: string, done) => {
  done(null, await AppDataSource.getRepository(User).findOne({
    where: { username: username },
  }));
});

app.use(function (req: Request, res: Response, next) {
  console.log(req.user, req.session)
  res.locals.user = req.user as User;
  next();
});

app.get('/user', async (req: Request, res: Response) => {
  
  console.log(req.user, res.locals, res.locals.user?.username);
  const user = await AppDataSource.getRepository(User).findOne({
    where: { username: Equal(res.locals.user?.username) },
  });
  console.log(res.locals.user?.username, user)

  if (user) {
    user.password = ''; // do not share
    res.json(user);
  } else {
    res.status(401).send({ message: 'unauthorized' });
  }
});

app.post('/login', passport.authenticate('local', {
  successRedirect: "/account",
  failureRedirect: "/login",
}));

app.post('/register', async (req: Request, res: Response) => {
  const user = new User();
  user.username = req.body.username;
  user.password = await argon2.hash(req.body.password);
  await AppDataSource.manager.save(user);

  res.redirect('/login');
});

app.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    console.log(err);
  });
  res.redirect('/');
})

app.listen(8000, () => {
  console.log('The application is listening on port 8000!');
});