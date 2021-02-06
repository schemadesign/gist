FROM node:8

RUN apt-get update && \
apt-get install -y chromium  && \
apt-get install -y openjdk-8-jdk && \
apt-get install -y ant && \
npm install -g bower && \
npm install -g grunt-cli  && \
apt-get clean;


ENV JAVA_HOME /usr/lib/jvm/java-8-openjdk-amd64/
RUN export JAVA_HOME

ENV NPM_CONFIG_LOGLEVEL warn
ENV NPM_CONFIG_DEPTH -1

WORKDIR /src

COPY package.json /src
COPY package-lock.json /src

RUN npm --version && \
    sed -i "s/.*postinstall.*//" package.json && \
    npm install  --depth=-1 --loglevel=warn

COPY bower.json /src

RUN echo '{ "allow_root": true }' > $HOME/.bowerrc && \
    bower install --config.interactive=false --allow-root

COPY . /src

RUN grunt build --force

ARG BRANCH_NAME
ARG COMMIT_HASH
ENV BRANCH_NAME=${BRANCH_NAME}
ENV COMMIT_HASH=${COMMIT_HASH}

CMD ["node", "--optimize_for_size", "--max-old-space-size=4096", "--gc_interval=100", "app.js"]
