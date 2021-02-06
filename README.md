# Gist

## Installation with Docker (works only locally)

Docker container allows you to run your development environment completely in the background.

Currently, `docker-compose` starts three containers:
 - `web` that holds node.js web application
 - `mongodb` that runs MongoDB
 - `redis` that runs Redis service

 Internally, docker setup separate network with own DNS so it is possible to use container names as the hostnames, e.g. http://web:3000/ URI is accessible from mongodb and redis containers.
 The containers expose defined ports outside on the host machine, e.g, web container expose port 9080 so you can
 open http://localhost:9080/ on your local web browser.

### O. Get the Docker, docker-compose
  - Mac OS: https://docs.docker.com/docker-for-mac/  (`docker-compose` is already included)
  - Ubuntu:
      - https://docs.docker.com/install/linux/docker-ce/ubuntu/
      - https://docs.docker.com/compose/install/#install-compose

### I. Download repo

1. First, clone this repository to your computer with `git clone git@github.com:schemadesign/gist.git`

### II. Creating your `.env.development`, `.env.production` and `.env.testing` files

Environment-related secrets such as the production password database are not committed to this repository as a security-related best practice.

In order to add them (and to support both local development and production deployment) you need to create two files named ".env.development" and ".env.production" in 'config/env/' of this repository at `gist/config/env/.env*` and then fill them respectively with the content which you can find in the EXAMPLE.env. It is necessary to fulfil S3 credentials (first four rows) either from the AWS S3 or from the Digital Ocean Space, also Mapbox to make world map working.

### III. Build the docker container with the web application

1. Run `make develop-build`

### IV. Adding views to the database.

1. Open `seed.json` and make sure it is configured with your local database name
2. Execute `make develop-seed-db` -- the data in `seeds/views.json` will be saved into your database.

Edit `seeds/views.json` when you want to edit the views config, then execute `make develop-seed-db` to save into the database. Commit `seeds/views.json` to Git so everyone can use your updated views.

### V. Running the front-end server locally

#### For Development
1. Run `make develop-start` to start development server in non-daemon mode with logs.

### VI. Changing your localhost settings on your computer and creating a local Gist account

1. Add app.local.arrays.co:
  * Run `sudo nano /etc/hosts` - You should see some numbers including your local ip address on the left column and host names on the right.
  * Add a new line `127.0.0.1    app.local.arrays.co` for the frontend
  * Add another new line `127.0.0.1    local.arrays.co` for the mongodb connection
  * Save the write changes with "control" + "o"
  * Hit "enter"
  * Exit with "control" + "x"

## VII. Creating an user

After the app is up and running you will want to create a user:

1. Access http://app.local.arrays.co:9080/signup/email?superUser=true (If you don't see a form please make command `make develop-grunt`)
2. Fill the form in and add a subdomain

    1. *The subdomain must be listed in the hosts file* (more details in point IX)
    2. email must be *youremail+superuser@schemadesign.com* (if you don't have an email address in the schemadesign.com domain then please update the domain in the code to one of your choices)


3. After confirming you will see an email template in the logs of the backend. Look for an URL with a token.
4. Copy and paste the URL to activate your user.
5. Now you can login in Gist.

### VIII. Add team subdomain to hosts

1. Add your subdomain to hosts
  * Run `sudo nano /etc/hosts` again.
  * Add a new line `127.0.0.1    [your team subdomain].local.arrays.co`
  * Save the write changes with control + "o"
  * Hit "enter"
  * Exit with "control" + "x"
  * You will now be able to navigate to your subdomain at [your team subdomain].local.arrays.co:9080
Anytime you add a new account in Gist, you will have a new subdomain. In order for that subdomain to work locally, you have to add it to your hosts file by repeating step 3.

## Installation on Digital Ocean

### I. Before you upload your code

1. Digital Ocean configuration:
- Create a droplet with Docker
- Create or have a domain (Gist uses subdomains and it won't work on the IP address) and add the Digital Ocean Network with DNSs which direct to your Droplet:
  * `<your_domain>`
  * `app.<your_domain>`
  * `*.<your_domain>`
- Generate new API key in the API tab for the spaces
- Create spaces and add CORS privileges for origin `http(s)://app.<your_domain>` for all methods and add Header `*`.

2. Create a Mapbox account.
Gist is using Mapbox to render world map.
- Create access key
- Create a basic layout to show a map containing countries only
- Create a roads layout to show a map containing roads only

3. Add files and changes in the code
- Find all occurrences of `gist.info` in the code and replace with your domain
- To create the first user we need to configure emails in the file `nodemailer.js` to get activation email or we will see this email on docker logs, but we need to change all occurrences of `@schemadesign.com` email to your email domain.
- Add `env.production` file in the `config/env` using `Exmaple.env` as an example and replace:
    * DO_ACCESS_KEY_ID=(digital ocean key id)
    * DO_SECRET_ACCESS_KEY=(digital ocean access key)
    * DO_S3_BUCKET=(digital ocean space name)
    * DO_S3_ENDPOINT=(digital ocean space endpoint for example `nyc3.digitaloceanspaces.com`, also please find this url in the code and replace to your endpoint)
    * MAPBOX_ACCESS_KEY=(your Mapbox access token)
    * MAPBOX_BASIC_LAYOUT=(URL of the basic layout)
    * MAPBOX_ROADS_LAYOUT=(URL of the basic layout)
    * FONT_CENTRANO_CDN=(URL to the Centra No font, or you can leave it empty and put the font in the folder `public/fonts/centrano2`. You can also replace font in the `public/stylesheets/base/typography/font-faces.css` and later replace all occurrences of the centrano2)
    * HOST=(your domain)
    * SUBDOMAIN=(your main subdomain)
    * NODE_ENV=production
    * MONGODB_URI=mongodb://*login*:*password*@mongodb:27017/arraysdb?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false (please replace login and password with you credentials which will be used by the admin user in mongodb)
    * USE_SSL=(`true` if your domain has SSL connection, `false` if your domain doesn't have SSL)
    * PORT=(`443` if your domain has SSL connection, `80` if your domain doesn't have SSL)

### II. Deploy your code

1. Connect to your droplet for example via ssh and deploy code there.
2. Build the app by running commands:
- `make build`
- `make develop-seed-db`
- `make start`
3. Configure MongoDB
- open the terminal and enter `mongodb` container with command `docker-compose exec  -e COLUMNS=222 mongodb bash`
- enter mongo shell with command `mongo`
- switch to admin db with command `use admin`
- create admin user with command `db.createUser({user: "your-login", pwd: "your-password", roles: [ { role: "readWrite", db: “admin”} ] })` (please replace login and password with your credentials which you put in the `MONGODB_URI`)
4. Restart the app with commands `make stop` and `make start`

### III. Creating the first user
1. Enter URL `http://app.<your-domain>/signup/email?superUser=true` and fill the data (if you don't see anything please run the command `make develop-grunt`). Please use as email `+superuser@schemadesign.com` or if you replaced to your email domain, with your domain `+superuser@<your-domain>`
2. In the docker logs you should see an email activation with the URL to activate account. If not you can also activate a user in the mongo shell by changing `activated` to `true`.


#### Or use dnsmasq

Map *.local.arrays.co to localhost, so new teams and subdomains do not have to be manually added to `/etc/hosts` every time.

Install dnsmasq:
`brew install dnsmasq`

Add *.local.arrays.co to config file:
`echo 'address=/.local.arrays.co/127.0.0.1' > $(brew --prefix)/etc/dnsmasq.conf`

Add to resolvers:
`sudo bash -c 'echo "nameserver 127.0.0.1" > /etc/resolver/local.arrays.co'`

if you do not have `/etc/resolver`, simply create it by `mkdir /etc/resolver`

Start dnsmasq and run on boot:
`sudo brew services start dnsmasq`

---------------------

## Running tests

---------------------

1. Run `make test`

This will run all fronted and backend tests in the container.

2. Gist Integration tests are kept [here](https://github.com/schemadesign/gist_integration_tests)

1. Run `npm install` to prepare all files and then
2. Run `npm run test:backend` for backend tests and `npm run test:frontend` for frontend tests.
-----------------------

## All make commands

-----------------------

Make commands in `development` environment

 - `develop` Run development services
 - `develop-start` Run development services & logs
 - `develop-status` Show the status of services.
 - `develop-logs` Show the logs on the terminal from web container.
 - `develop-stop` Stop the containers.
 - `develop-restart` Restart the containers.
 - `develop-build` Rebuild web container.
 - `develop-build-nocache` build web container (no cache)
 - `develop-restart-node` restart node inside the container
 - `develop-seed-db` Seed database (`npm run seed`).
 - `develop-exec-bash` Run bash in the web container.

Make commands for testing

 - `test` run tests in `testing` enviroment

Misc commands

 - `run-debugger` stop the development web container and run again with debug mode (see below)
 - `stop-all` stop all container
 - `lint-fix` for running JS linter.

---------------------
## Run app in debugger mode.

1. `make run-debugger`

This will stop the `web` container and run it again, exposing debugger port `9229` and run in non daemon mode (all logs in the terminal) with a single worker.
Keep in mind if you run your app in the debugger mode, you cannot use other `make develop-*` commands.
You can stop the debug-mode by `Ctrl+C`;

2. Click `Debug` button in VS code.
3. Set the `configuration`:

```json
        {
            "type": "node",
            "request": "attach",
            "name": "Docker: Attach to Node",
            "port": 9229,
            "address": "localhost",
            "localRoot": "${workspaceFolder}",
            "remoteRoot": "/src",
            "protocol": "inspector"
        }
```


### Issue `Unable to open devtools socket: address already in use`

This is usually related to the fact that two node instances tries to bind the same port. The simple solution is to stop the command and run it again with Ctrl+C;
You can also check if the `web` container is running with `docker ps` command.

---------------------

## Troubleshooting

---------------------

1. The Gist app loads AWS credentials from the .env files. There are quite a few ways that AWS credentials can be loaded, and they exist in a *provider chain*. Keep this in mind if you're running into AWS related issues: you may be unintentionally overriding the credentials.
2. If you are seeing errors related to the `sharp` node package, try this:
    * Change directory (`cd [the path to]/gist/node_modules/sharp`) into the `sharp` directory of your local clone of this repository
    * Run `npm install`
3. By default the mongodb and redis containers exposes locally the ports (27017 and 6379 respectively). If you try to start again containers, you get the following error:

    `ERROR: for mongodb  Cannot start service mongodb: driver failed programming external connectivity on endpoint arraystesting_mongodb_1 (0d0b754cd4c943ccdc051b14a38cde0a11c65409f9d3916395a1905d55ebd024): Bind for 0.0.0.0:27017 failed: port is already allocated`

    You have to kill the containers that already use the ports, e.g. `docker kill $(docker ps -q)` to kill all containers.

    By default the testing containers does not expose ports to mongodb and redis. However, you can add this by editing `docker-compose.test.yml` and enabling lines with `- ports:`.

4. Problem with existing container name:

    `ERROR: for mongodb  Cannot create container for service mongodb: Conflict. The container name "/mongodb" is already in use by container "86e6470e1e7dd82e798fa677cfc210c4aac0d749e68f5907123f6c005fea71b2". You have to remove (or rename) that container to be able to reuse that name.`

    Check the containers that runs already by `docker ps` and kill container with the same name.

5. Travis stops because of wrong encryption key

    If your travis-ci build returns following error:

    `$ openssl aes-256-cbc -K $encrypted_29d90a842206_key -iv $encrypted_29d90a842206_iv -in .env.testing.enc -out config/env/.env.testing -d
    bad decrypt
    140444667311776:error:06065064:digital envelope routines:EVP_DecryptFinal_ex:bad decrypt:evp_enc.c:539:
    The command "openssl aes-256-cbc -K $encrypted_29d90a842206_key -iv $encrypted_29d90a842206_iv -in .env.testing.enc -out config/env/.env.testing -d"
    `

    then you have to recreate `.env.testing.inc` file that holds the content of `config/env/.env.testing`

        1. Run `travis encrypt-file config/env/.env.testing`
        2. Edit `.travis.yml` and replace line in `before_install:` which starts of `- openssl` with the line returned by the `travis` command.

6. Running or building container cause unexpected errors related to wrong .json files

    1. Run the build process without cache `make develop-build-nocache` or `make test-build-nocache`.

7. Travis fails with a nonsense error - how to live?

    This can happen from time to time. If your tests run correctly on your local machine (via `make test` command) then you have to debug the problem directly in the travis service.
    To do that you can use **Debug build** available on the page with the task.
    Reference: https://docs.travis-ci.com/user/running-build-in-debug-mode/

8. Clean up your local docker environment

    You can use script `bin/cleanup-docker.sh`.

9. Error from trying to seed db:

    `err =  { MongoError: failed to connect to server [undefined:27017] on first connect [MongoError: getaddrinfo ENOTFOUND undefined undefined:27017]`

    include the node environment in run seed command `NODE_ENV=development npm run seed`
