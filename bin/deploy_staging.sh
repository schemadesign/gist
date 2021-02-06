#!/bin/bash

make login
make build
make push-staging
make release-staging
