#!/bin/bash

sed -i -n -e 's/{ O_TRUNC, O_CREAT, O_RDWR, O_EXCL, O_RDONLY }/cst/g' -e 's/O_/cst.O_/g' node_modules/fastfile/src/fastfile.js
