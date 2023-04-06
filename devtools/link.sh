#!/bin/zsh
find deps/**/*.ts -exec sed -i '' 's/devlink\//devlink\*\//g' {} \;