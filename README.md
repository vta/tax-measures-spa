# VTA Tax Measures Single Page Application

## Setup

Requires node.js and yarn to be installed.

Install node.js

https://nodejs.org/

Install Yarn

https://yarnpkg.com/

Install dependencies

    yarn

Setup configurtion by  creating a `.env` file in the project root with the following:

    AIRTABLE_API_KEY=your-airtable-api-key
    AIRTABLE_BASE_ID=your-airtable-base-id
    HOST=http://localhost:3000

## Running locally

Start the development server:

    yarn dev

Open http://localhost:3000 in your browser
    
## Building a staticly compiled version for production

Rollow the setup inistructions above, and then run:

    yarn build

## Running in production

Runs the built app in production mode:

    yarn start
    