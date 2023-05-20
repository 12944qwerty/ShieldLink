# ShieldLink
Secure data transfer website. Made for a hackathon. Theme was security.

## How it works
When you create an account, your password is hashed by `argon2`, arguably the best password hasher. A public key and private key is also created for end-to-end encryption. Both keys are stored in the database, but the private key is encrypted by the unhashed password, which only the user will know. 

When you send "data" to another user, that data is encrypted assymetrically. The recipient's public key is used to encrypt it. The only way for the encryption to be decrypted is with the private key, which is encrypted by the password.

When you try accessing the data, you're asked for your password. This is so that the server can decrypt your private key which decrypts the data. Then the server sends the decrypted data to your webpage and reveals it.

There are multiple layers of encryption and decryption going on here.

## Development
Make sure you have node and npm installed.
Then install pnpm via `npm i -g pnpm`. We use pnpm instead of npm.

Then, install all the packages. `pnpm i`
Then build with `pnpm build` and then run the server with `node .`

Rebuild and rerun server anytime you make changes to a ts file. Not needed when you make changes to the static files in `public/`
