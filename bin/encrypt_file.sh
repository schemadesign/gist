#!/bin/bash

FILE=$1
SECRET_KEY=$2
FILENAME=$(basename $FILE)

echo "usage: ./$0 FILE SECRET_KEY"

travis encrypt secret_password=$SECRET_KEY

echo "Please update .travis.yml, put the secure variable"

openssl aes-256-cbc -k ${SECRET_KEY} -in ${FILE} -out $FILENAME.enc -v

# Verify
openssl aes-256-cbc -k ${SECRET_KEY} -in ${FILENAME}.enc -v -out dd -d
diff dd ${FILE} && echo "File correctly encrypted" && rm dd

echo "generated secret file $FILENAME.enc from ${FILE}"
echo "updating .travis.yml"

sed -ie "s#\s+- openssl.*# - openssl aes-256-cbc -k \$secret_password -in $FILENAME.enc -out $FILE -d#g" .travis.yml
git add $FILENAME.enc
git add .travis.yml
