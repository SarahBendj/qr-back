#!/bin/bash

if [ ! -f "prisma/schema.prisma" ]; then
  echo " Initializing Prisma..."
  npx prisma init
fi

echo " Generating Prisma client..."
npx prisma generate


echo "Applying migrations..."
npx prisma migrate dev --name init --smart-qr

echo "Building NestJS app..."
npm run build

echo "Starting NestJS app..."
node dist/main.js
